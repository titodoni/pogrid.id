<?php

namespace App\Observers;

use App\Events\DataRefreshed;
use Illuminate\Database\Eloquent\Model;

class DataSyncObserver
{
    public static bool $enableInTests = false;

    public function saved(Model $model): void
    {
        $this->broadcastSync($model);
    }

    public function deleted(Model $model): void
    {
        $this->broadcastSync($model);
    }

    protected function broadcastSync(Model $model): void
    {
        if (app()->runningUnitTests() && !self::$enableInTests) {
            return;
        }

        $tenantId = null;

        // Try to get tenant_id directly from model attributes
        if (isset($model->tenant_id)) {
            $tenantId = $model->tenant_id;
        } elseif (method_exists($model, 'tenant') && $model->tenant) {
            $tenantId = $model->tenant->id;
        } elseif ($model instanceof \App\Models\Tenant) {
            $tenantId = $model->id;
        } else {
            $tenantId = \App\Services\TenantManager::getTenantId();
        }

        if ($tenantId) {
            broadcast(new DataRefreshed((int)$tenantId))->toOthers();
        }
    }
}
