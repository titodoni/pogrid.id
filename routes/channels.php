<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('tenant.{tenantId}.dashboard', function (User $user, int $tenantId) {
    if ((int) $user->tenant_id !== (int) $tenantId) {
        return false;
    }

    return $user->is_owner || $user->role_level === 'office' || strcasecmp($user->role_name, 'PPIC') === 0 || strcasecmp($user->post_name ?? '', 'PPIC') === 0;
});

Broadcast::channel('tenant.{tenantId}.workers', function (User $user, int $tenantId) {
    if ((int) $user->tenant_id !== (int) $tenantId) {
        return false;
    }

    return true;
});

Broadcast::channel('tenant.{tenantId}.presence', function (User $user, int $tenantId) {
    if ((int) $user->tenant_id !== (int) $tenantId) {
        return false;
    }

    return [
        'id' => $user->id,
        'name' => $user->name,
        'post_name' => $user->post_display_name ?? $user->post_name ?? 'Staff',
        'role' => $user->role_display_name ?? $user->role_name ?? 'Worker',
    ];
});
