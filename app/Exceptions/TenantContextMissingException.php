<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a tenant-scoped model is queried without tenant context and
 * without an explicit TenantManager::bypass() / runWithoutScope().
 *
 * Fail-closed by design: a missing context is a programming error and must
 * never silently become a cross-tenant query.
 */
class TenantContextMissingException extends RuntimeException
{
    public static function forModel(string $modelClass): self
    {
        return new self(
            "Tenant scope fail-closed: attempted to query [{$modelClass}] without tenant context. ".
            'Set TenantManager::setTenantId() or use TenantManager::runWithoutScope() explicitly.'
        );
    }
}
