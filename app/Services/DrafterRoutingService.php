<?php

namespace App\Services;

use App\Events\TaskUpdated;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Handles atomic drafter drawing approval, technical onboarding,
 * and stage routing synchronization.
 */
class DrafterRoutingService
{
    /**
     * Standard mandatory envelope keywords.
     */
    public const PRE_PRODUCTION_DEFAULT = ['Design', 'Material'];

    public const POST_PRODUCTION_DEFAULT = ['QC', 'Delivery'];

    /**
     * Update drafter status and synchronize stage routing.
     *
     * @param  array<string>|null  $updatedStages
     */
    public function updateStatusAndRouting(Item $item, string $drafterStatus, ?array $updatedStages = null, ?User $user = null): Item
    {
        return DB::transaction(function () use ($item, $drafterStatus, $updatedStages) {
            $item->loadMissing('itemProgresses', 'po');

            // 1. If explicit stages provided by Drafter, sanitize and synchronize
            if ($updatedStages !== null && count($updatedStages) > 0) {
                $finalStages = $this->sanitizeStages($item, $updatedStages);
                $item->required_stages = $finalStages;
                $this->syncItemProgressStages($item, $finalStages);
            }

            // 2. Update item drafter_status
            $item->drafter_status = $drafterStatus;
            $item->save();

            // 3. Update Design stage progress
            $this->updateDesignProgress($item, $drafterStatus);

            // 4. Realtime broadcast
            broadcast(new TaskUpdated(
                $item->tenant_id,
                "Drafter status updated to '{$drafterStatus}' for item '{$item->item_name}' (PO: {$item->po?->po_number})."
            ))->toOthers();

            return $item->fresh(['itemProgresses', 'po']);
        });
    }

    /**
     * Update item stage routing without changing drafter status.
     * Used by PPIC and Admin.
     *
     * @param  array<string>  $updatedStages
     */
    public function updateRoutingOnly(Item $item, array $updatedStages, ?User $user = null): Item
    {
        return DB::transaction(function () use ($item, $updatedStages) {
            $item->loadMissing('itemProgresses', 'po');

            $finalStages = $this->sanitizeStages($item, $updatedStages);
            $item->required_stages = $finalStages;
            $item->save();

            $this->syncItemProgressStages($item, $finalStages);

            broadcast(new TaskUpdated(
                $item->tenant_id,
                "Alur produksi diperbarui untuk item '{$item->item_name}' (PO: {$item->po?->po_number})."
            ))->toOthers();

            return $item->fresh(['itemProgresses', 'po']);
        });
    }

    /**
     * Sanitize stage list to ensure mandatory envelope integrity for manufacture items.
     *
     * @param  array<string>  $stages
     * @return array<string>
     */
    public function sanitizeStages(Item $item, array $stages): array
    {
        $cleaned = array_values(array_unique(array_filter(array_map('trim', $stages))));

        if (empty($cleaned)) {
            return is_array($item->required_stages) ? $item->required_stages : ['Design', 'Machining', 'QC', 'Delivery'];
        }

        // Ensure Design is at the beginning if not present
        $hasDesign = false;
        foreach ($cleaned as $s) {
            if (stripos($s, 'design') !== false || stripos($s, 'gambar') !== false || stripos($s, 'draft') !== false) {
                $hasDesign = true;
                break;
            }
        }
        if (! $hasDesign) {
            array_unshift($cleaned, 'Design');
        }

        // For MANUFACTURE items, ensure QC & Delivery are included
        if ($item->item_type === 'MANUFACTURE') {
            $hasQc = false;
            $hasDelivery = false;
            foreach ($cleaned as $s) {
                if (stripos($s, 'qc') !== false) {
                    $hasQc = true;
                }
                if (stripos($s, 'delivery') !== false || stripos($s, 'pengiriman') !== false) {
                    $hasDelivery = true;
                }
            }

            if (! $hasQc) {
                // Insert QC before Delivery or at the end
                $cleaned[] = 'QC';
            }
            if (! $hasDelivery) {
                $cleaned[] = 'Delivery';
            }
        }

        return $cleaned;
    }

    /**
     * Synchronize ItemProgress records with the updated required_stages.
     *
     * @param  array<string>  $stages
     */
    private function syncItemProgressStages(Item $item, array $stages): void
    {
        $existing = $item->itemProgresses()->get();
        $existingNames = $existing->pluck('stage_name')->all();

        // 1. Create missing stages
        foreach ($stages as $stageName) {
            if (! in_array($stageName, $existingNames, true)) {
                ItemProgress::create([
                    'tenant_id' => $item->tenant_id,
                    'item_id' => $item->id,
                    'stage_name' => $stageName,
                    'completed_qty' => 0,
                    'progress_percent' => 0.00,
                    'status' => 'PENDING',
                ]);
            }
        }

        // 2. Prune obsolete stages only if they have 0 completed quantity and 0 percent
        foreach ($existing as $existingProgress) {
            if (! in_array($existingProgress->stage_name, $stages, true)) {
                if ((int) $existingProgress->completed_qty === 0 && (float) $existingProgress->progress_percent === 0.00) {
                    $existingProgress->delete();
                }
            }
        }
    }

    /**
     * Update the Design / Gambar stage record.
     */
    private function updateDesignProgress(Item $item, string $drafterStatus): void
    {
        $designProgress = ItemProgress::where('item_id', $item->id)
            ->where(function ($q) {
                $q->where('stage_name', 'like', '%Design%')
                    ->orWhere('stage_name', 'like', '%DESIGN%')
                    ->orWhere('stage_name', 'like', '%Gambar%')
                    ->orWhere('stage_name', 'like', '%gambar%')
                    ->orWhere('stage_name', 'like', '%Draft%')
                    ->orWhere('stage_name', 'like', '%draft%');
            })
            ->first();

        if ($designProgress) {
            $pct = $drafterStatus === 'APPROVED' ? 100.00 : 50.00;
            $status = $pct >= 100.00 ? 'COMPLETED' : 'IN_PROGRESS';

            $designProgress->update([
                'completed_qty' => round($item->target_qty * ($pct / 100)),
                'progress_percent' => $pct,
                'status' => $status,
                'previous_completed_qty' => $designProgress->completed_qty,
                'previous_progress_percent' => $designProgress->progress_percent,
            ]);
        }
    }
}
