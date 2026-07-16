<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('tenant.{tenantId}.dashboard', function (User $user, int $tenantId) {
    return $user->tenant_id === $tenantId
        && ($user->is_owner || $user->role_level === 'office');
});

Broadcast::channel('tenant.{tenantId}.workers', function (User $user, int $tenantId) {
    return $user->tenant_id === $tenantId
        && $user->role_level === 'production';
});
