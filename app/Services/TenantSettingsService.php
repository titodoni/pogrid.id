<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Http\UploadedFile;

/**
 * Owns tenant company/workflow settings persistence, including logo upload.
 *
 * Authorization and validation stay in the controller; this service performs
 * the writes. Behavior is a verbatim move — no rule or default changes.
 */
class TenantSettingsService
{
    public function updateCompany(string $companyName, ?string $theme = null, ?UploadedFile $logo = null): Tenant
    {
        $tenant = Tenant::find(TenantManager::getTenantId());

        $data = ['company_name' => $companyName];

        if (! empty($theme)) {
            $data['theme'] = $theme;
        }

        if ($logo) {
            $filename = 'logo_'.$tenant->id.'_'.time().'.'.$logo->getClientOriginalExtension();
            $logo->move(public_path('uploads/logos'), $filename);
            $data['logo_path'] = '/uploads/logos/'.$filename;
        }

        $tenant->update($data);

        return $tenant;
    }

    /**
     * @param  array<string, mixed>  $input  Validated workflow settings payload.
     */
    public function updateWorkflowSettings(array $input): Tenant
    {
        $tenant = Tenant::find(TenantManager::getTenantId());

        $tenant->update([
            'workflow_settings' => [
                'workflow_mode' => $input['workflow_mode'],
                'require_design_approved_for_production' => (bool) ($input['require_design_approved_for_production'] ?? false),
                'require_material_ready_for_production' => (bool) ($input['require_material_ready_for_production'] ?? false),
                'require_production_completed_for_qc' => (bool) ($input['require_production_completed_for_qc'] ?? true),
                'require_qc_completed_for_delivery' => (bool) ($input['require_qc_completed_for_delivery'] ?? true),
                'require_delivery_for_finance' => (bool) ($input['require_delivery_for_finance'] ?? true),
            ],
        ]);

        return $tenant;
    }
}
