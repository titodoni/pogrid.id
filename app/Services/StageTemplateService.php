<?php

namespace App\Services;

use App\Models\TenantStageTemplate;

/**
 * Owns tenant stage-template persistence and read shaping.
 *
 * Authorization (Gate) and validation stay in the controller; this service
 * only reads and writes templates for the current tenant.
 */
class StageTemplateService
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function listForTenant(): array
    {
        return TenantStageTemplate::where('tenant_id', TenantManager::getTenantId())
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $t->description,
                'stages' => $t->stages,
                'sort_order' => $t->sort_order,
            ])
            ->all();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): TenantStageTemplate
    {
        return TenantStageTemplate::create([
            'tenant_id' => TenantManager::getTenantId(),
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'stages' => $data['stages'],
            'sort_order' => $data['sort_order'] ?? 0,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(int|string $templateId, array $data): TenantStageTemplate
    {
        $template = $this->findForTenant($templateId);

        $template->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'stages' => $data['stages'],
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return $template;
    }

    public function delete(int|string $templateId): void
    {
        $this->findForTenant($templateId)->delete();
    }

    private function findForTenant(int|string $templateId): TenantStageTemplate
    {
        return TenantStageTemplate::where('tenant_id', TenantManager::getTenantId())
            ->findOrFail($templateId);
    }
}
