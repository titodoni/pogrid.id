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
}
