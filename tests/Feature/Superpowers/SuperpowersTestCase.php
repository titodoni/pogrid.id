<?php

namespace Tests\Feature\Superpowers;

use App\Models\Plan;
use App\Models\PlatformAdmin;
use App\Models\Tenant;
use App\Services\TenantManager;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

/**
 * Shared setup for Superpowers (platform admin panel) feature tests.
 *
 * The panel lives outside tenant scope entirely, so these helpers create
 * fixtures through TenantManager::runWithoutScope() rather than relying on a
 * tenant context being present.
 */
abstract class SuperpowersTestCase extends TestCase
{
    protected function createAdmin(array $attributes = []): PlatformAdmin
    {
        return PlatformAdmin::create(array_merge([
            'name' => 'Platform Dev',
            'email' => 'dev@pogrid.test',
            'password' => Hash::make('platform-secret'),
            'is_active' => true,
        ], $attributes));
    }

    /** An admin with TOTP enabled; returns [admin, plaintextSecret]. */
    protected function createAdminWithTotp(array $attributes = []): array
    {
        $secret = (new Google2FA)->generateSecretKey();

        $admin = $this->createAdmin(array_merge([
            'email' => 'twofactor@pogrid.test',
            'two_factor_secret' => $secret,
        ], $attributes));

        return [$admin, $secret];
    }

    /** Log in as a platform admin with the 2FA gate already satisfied. */
    protected function actingAsPlatformAdmin(?PlatformAdmin $admin = null): PlatformAdmin
    {
        $admin ??= $this->createAdmin();

        $this->actingAs($admin, 'platform');
        $this->withSession(['platform.2fa.verified' => $admin->id]);

        return $admin;
    }

    protected function makeTenant(array $attributes = []): Tenant
    {
        return TenantManager::runWithoutScope(fn () => Tenant::create(array_merge([
            'company_name' => 'Teknik Mandiri',
            'slug' => 'teknik-mandiri',
            'subscription_status' => Tenant::STATUS_ACTIVE,
        ], $attributes)));
    }

    protected function starterPlanId(): int
    {
        // Seeded by the create_plans_table migration.
        return (int) Plan::where('name', 'Starter')->value('id');
    }
}
