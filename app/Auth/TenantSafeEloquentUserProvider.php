<?php

namespace App\Auth;

use App\Services\TenantManager;
use Illuminate\Auth\EloquentUserProvider;

/**
 * Authentication user provider that resolves users outside the tenant scope.
 *
 * Rationale: Laravel's session/auth layer resolves the current user BEFORE
 * the SetTenant middleware runs (session start → guard user resolution).
 * Identity lookup is therefore pre-tenant by design and must bypass the
 * fail-closed TenantScope explicitly. All tenant-scoped authorization still
 * happens downstream (SetTenant sets the context; TenantScope constrains
 * every business query; gates/policies enforce roles).
 */
class TenantSafeEloquentUserProvider extends EloquentUserProvider
{
    public function retrieveById($identifier)
    {
        return TenantManager::runWithoutScope(fn () => parent::retrieveById($identifier));
    }

    public function retrieveByToken($identifier, $token)
    {
        return TenantManager::runWithoutScope(fn () => parent::retrieveByToken($identifier, $token));
    }

    public function retrieveByCredentials(array $credentials)
    {
        return TenantManager::runWithoutScope(fn () => parent::retrieveByCredentials($credentials));
    }
}
