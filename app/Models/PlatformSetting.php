<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Key-value store for platform-wide configuration. Currently seeded with
 * maintenance_mode and maintenance_message. Superadmin reads/writes via this
 * model; other code reads via the cached facade helper.
 */
class PlatformSetting extends Model
{
    use HasFactory;

    public const UPDATED_AT = 'updated_at';

    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * Get a setting value by key. Returns null if not found.
     */
    public static function get(string $key, ?string $default = null): ?string
    {
        $setting = static::where('key', $key)->first();

        return $setting?->value ?? $default;
    }

    /**
     * Set a setting value. Creates the row if it doesn't exist.
     */
    public static function set(string $key, ?string $value): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'updated_at' => now()],
        );
    }

    /**
     * Check if maintenance mode is enabled.
     */
    public static function isMaintenanceMode(): bool
    {
        return static::get('maintenance_mode', '0') === '1';
    }

    /**
     * Get the maintenance message (if any).
     */
    public static function getMaintenanceMessage(): ?string
    {
        return static::get('maintenance_message');
    }
}
