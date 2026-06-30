<?php

namespace App\Models\Scopes;

use App\Services\TenantManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (TenantManager::isBypassed()) {
            return;
        }

        $tenantId = TenantManager::getTenantId();
        if ($tenantId !== null) {
            $builder->where($model->getTable().'.tenant_id', '=', $tenantId);
        }
    }
}
