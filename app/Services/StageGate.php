<?php

namespace App\Services;

use App\Models\ItemProgress;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Authoritative server-side stage-access gate (role map + workflow locks).
 * Extracted verbatim from WorkerDashboardController::validateStageAccess.
 * Rules come from config/workflow.php — single source of truth.
 */
class StageGate
{
    public static function isPreProductionStage(string $stageNameLower): bool
    {
        foreach (config('workflow.pre_production_keywords') as $keyword) {
            if (str_contains($stageNameLower, $keyword)) {
                return true;
            }
        }

        return false;
    }

    public static function assertCanUpdate(ItemProgress $progress, User $user): void
    {
        $user->loadMissing('roleRelation');
        $roleName = $user->role_name;
        $isOffice = $user->role_level === 'office';

        // 1. Role validation check using the authoritative stage-role map
        //    (config/workflow.php — shared with the client via Inertia props).
        if (! $isOffice) {
            $stageLower = strtolower($progress->stage_name);
            foreach (config('workflow.stage_role_map') as $entry) {
                foreach ($entry['keywords'] as $keyword) {
                    if (str_contains($stageLower, $keyword)) {
                        $roles = $entry['roles'];
                        if (! in_array($roleName, $roles)) {
                            $rolesStr = implode('/', $roles);
                            Response::deny("Stage locked: Only {$rolesStr} operators can update this stage.")->authorize();
                        }
                        break 2;
                    }
                }
            }
        }

        $item = $progress->item;
        if (! $item) {
            return;
        }

        $requiredStages = $item->required_stages ?? [];
        $isVendorChecked = in_array('Vendor', $requiredStages);
        $isMachiningChecked = in_array('Machining', $requiredStages) || in_array('CNC', $requiredStages);
        $isFabricationChecked = in_array('Fabrication', $requiredStages) || in_array('FABRICATION', $requiredStages) || in_array('FABRIKASI', $requiredStages);
        $stageNameLower = strtolower($progress->stage_name);

        // 2. Off-state locks and workflow locks
        if (! $isOffice) {
            if ($isVendorChecked) {
                if (str_contains($stageNameLower, 'machining') ||
                    str_contains($stageNameLower, 'fabrication') || str_contains($stageNameLower, 'fabrikasi') ||
                    str_contains($stageNameLower, 'qc') ||
                    str_contains($stageNameLower, 'delivery') || str_contains($stageNameLower, 'pengiriman')) {
                    Response::deny('Stage locked: This is a Vendor job, so other production stages are locked.')->authorize();
                }
            }

            if ($isMachiningChecked && ! $isFabricationChecked) {
                if (str_contains($stageNameLower, 'fabrication') || str_contains($stageNameLower, 'fabrikasi')) {
                    Response::deny('Stage locked: Fabrication is not required/checked for this item.')->authorize();
                }
            }

            if ($isFabricationChecked && ! $isMachiningChecked) {
                if (str_contains($stageNameLower, 'machining')) {
                    Response::deny('Stage locked: Machining is not required/checked for this item.')->authorize();
                }
            }

            // Resolve workflow locks via Tenant settings
            $tenant = Tenant::find(TenantManager::getTenantId());
            $settings = $tenant->workflow_settings ?? [];
            $workflowMode = $settings['workflow_mode'] ?? 'loose';

            if ($workflowMode === 'strict') {
                $reqDesign = true;
                $reqMaterial = true;
                $reqProductionForQc = true;
                $reqQcForDelivery = true;
            } elseif ($workflowMode === 'loose') {
                $reqDesign = false;
                $reqMaterial = false;
                $reqProductionForQc = true;
                $reqQcForDelivery = true;
            } else {
                $reqDesign = (bool) ($settings['require_design_approved_for_production'] ?? false);
                $reqMaterial = (bool) ($settings['require_material_ready_for_production'] ?? false);
                $reqProductionForQc = (bool) ($settings['require_production_completed_for_qc'] ?? true);
                $reqQcForDelivery = (bool) ($settings['require_qc_completed_for_delivery'] ?? true);
            }

            // Design blocks Production
            if ($reqDesign && (str_contains($stageNameLower, 'machining') || str_contains($stageNameLower, 'cnc') || str_contains($stageNameLower, 'fabrication') || str_contains($stageNameLower, 'fabrikasi'))) {
                $designProgress = ItemProgress::where('item_id', $item->id)
                    ->where(function ($q) {
                        $q->where('stage_name', 'like', '%design%')
                            ->orWhere('stage_name', 'like', '%gambar%')
                            ->orWhere('stage_name', 'like', '%draft%');
                    })
                    ->first();
                if ($designProgress && $designProgress->status !== 'COMPLETED') {
                    Response::deny('Stage locked: Production requires Design/Drawing to be completed/approved.')->authorize();
                }
            }

            // Material blocks Production
            if ($reqMaterial && (str_contains($stageNameLower, 'machining') || str_contains($stageNameLower, 'cnc') || str_contains($stageNameLower, 'fabrication') || str_contains($stageNameLower, 'fabrikasi'))) {
                $materialProgress = ItemProgress::where('item_id', $item->id)
                    ->where(function ($q) {
                        $q->where('stage_name', 'like', '%material%')
                            ->orWhere('stage_name', 'like', '%bahan%')
                            ->orWhere('stage_name', 'like', '%vendor%')
                            ->orWhere('stage_name', 'like', '%purchasing%');
                    })
                    ->first();
                if ($materialProgress && $materialProgress->status !== 'COMPLETED') {
                    Response::deny('Stage locked: Production requires Material/Bahan to be ready/completed.')->authorize();
                }
            }

            // QC requires all preceding stages (by required_stages order) to be COMPLETED
            if ($reqProductionForQc && str_contains($stageNameLower, 'qc') && ! str_contains($stageNameLower, 'rework')) {
                $requiredStages = $item->required_stages ?? [];
                $qcIndex = null;
                foreach ($requiredStages as $i => $rs) {
                    if (str_contains(strtolower($rs), 'qc') && ! str_contains(strtolower($rs), 'rework')) {
                        $qcIndex = $i;
                        break;
                    }
                }

                if ($qcIndex !== null) {
                    $precedingNames = array_slice($requiredStages, 0, $qcIndex);
                    $precedingStages = ItemProgress::where('item_id', $item->id)
                        ->whereIn('stage_name', $precedingNames)
                        ->get();

                    foreach ($precedingStages as $stage) {
                        if ($stage->status !== 'COMPLETED') {
                            Response::deny("Stage locked: QC requires all preceding stages to be COMPLETED first. ({$stage->stage_name} is not done yet)")->authorize();
                        }
                    }
                }
            }

            // Delivery stage update lockout
            if ($reqQcForDelivery && (str_contains($stageNameLower, 'delivery') || str_contains($stageNameLower, 'pengiriman'))) {
                $qcProgress = ItemProgress::where('item_id', $item->id)
                    ->where('stage_name', 'QC')
                    ->first();
                if (! $qcProgress || ($qcProgress->completed_qty <= 0 && $qcProgress->progress_percent <= 0)) {
                    Response::deny('Stage locked: Delivery cannot be updated until QC stage has completed quantities.')->authorize();
                }
            }
        }
    }
}
