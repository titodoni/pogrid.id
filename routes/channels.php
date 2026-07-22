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

Broadcast::channel('tenant.{tenantId}.presence', function (User $user, int $tenantId) {
    if ((int) $user->tenant_id !== (int) $tenantId) {
        return false;
    }
    return [
        'id'        => $user->id,
        'name'      => $user->name,
        'post_name' => $user->post_display_name ?? $user->post_name ?? 'Staff',
        'role'      => $user->role_display_name ?? $user->role_name ?? 'Worker',
    ];
});

