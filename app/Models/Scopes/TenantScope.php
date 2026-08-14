<?php

namespace App\Models\Scopes;

use App\Exceptions\TenantContextMissingException;
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

        // Fail-closed: no tenant context must never become an unscoped query.
        if ($tenantId === null) {
            throw TenantContextMissingException::forModel(get_class($model));
        }

        $builder->where($model->getTable().'.tenant_id', '=', $tenantId);
    }
}
