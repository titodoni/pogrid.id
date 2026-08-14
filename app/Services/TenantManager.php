<?php

namespace App\Services;

class TenantManager
{
    protected static ?int $tenantId = null;

    protected static bool $bypass = false;

    public static function setTenantId(?int $tenantId): void
    {
        static::$tenantId = $tenantId;
    }

    public static function getTenantId(): ?int
    {
        return static::$tenantId;
    }

    public static function bypass(): void
    {
        static::$bypass = true;
    }

    public static function enableScope(): void
    {
        static::$bypass = false;
    }

    public static function isBypassed(): bool
    {
        return static::$bypass;
    }

    /**
     * Nest-safe explicit cross-tenant escape hatch. Saves and restores BOTH
     * state fields (bypass flag + tenant id), so nested or exceptional exits
     * cannot corrupt the surrounding context. Prefer this over manual
     * bypass()/enableScope() pairs.
     */
    public static function runWithoutScope(callable $callback): mixed
    {
        $previousBypass = static::$bypass;
        $previousTenantId = static::$tenantId;

        static::$bypass = true;

        try {
            return $callback();
        } finally {
            static::$bypass = $previousBypass;
            static::$tenantId = $previousTenantId;
        }
    }
}
