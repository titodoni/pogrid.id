<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * Platform-level superadmin (POGrid developer). Deliberately does NOT use
 * BelongsToTenant — this entity lives outside the tenant scope entirely and is
 * authenticated through the separate `platform` guard.
 */
class PlatformAdmin extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'is_active',
        'last_login_at',
        'avatar_url',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'two_factor_recovery_codes' => 'array',
        ];
    }

    /**
     * The TOTP secret is stored encrypted at the application layer. Accessors
     * transparently encrypt/decrypt so callers work with the plaintext secret.
     */
    public function setTwoFactorSecretAttribute(?string $value): void
    {
        $this->attributes['two_factor_secret'] = $value === null
            ? null
            : encrypt($value);
    }

    public function getTwoFactorSecretAttribute(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return decrypt($value);
    }

    public function hasTwoFactorEnabled(): bool
    {
        return ! empty($this->two_factor_secret);
    }

    public function verifyTotp(string $code): bool
    {
        if (! $this->hasTwoFactorEnabled()) {
            return false;
        }

        return (new Google2FA)->verifyKey($this->two_factor_secret, $code);
    }

    /**
     * @return array<int, string> The freshly generated plaintext recovery codes.
     */
    public function generateRecoveryCodes(): array
    {
        $codes = collect(range(1, 8))
            ->map(fn () => Str::upper(Str::random(5)).'-'.Str::upper(Str::random(5)))
            ->all();

        $this->two_factor_recovery_codes = array_map(
            fn (string $code) => hash('sha256', $code),
            $codes,
        );

        return $codes;
    }

    /**
     * Consume a recovery code if it matches. Returns true when a code was used.
     */
    public function useRecoveryCode(string $code): bool
    {
        $hashed = hash('sha256', $code);
        $codes = $this->two_factor_recovery_codes ?? [];

        if (! in_array($hashed, $codes, true)) {
            return false;
        }

        $this->two_factor_recovery_codes = array_values(
            array_filter($codes, fn (string $existing) => $existing !== $hashed),
        );
        $this->save();

        return true;
    }
}
