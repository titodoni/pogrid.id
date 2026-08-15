<?php

namespace Tests\Feature\Superpowers;

use App\Models\Plan;
use App\Models\PlatformSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

/**
 * Platform-wide switches that reach into tenant requests: read-only
 * (subscription lapsed) and maintenance mode.
 */
class SuperpowersPlatformControlsTest extends SuperpowersTestCase
{
    use RefreshDatabase;

    private function tenantOwner(Tenant $tenant): User
    {
        return TenantManager::runWithoutScope(fn () => User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Sari Dewi',
            'email' => 'sari@teknik.test',
            'email_verified_at' => now(),
            'password' => Hash::make('poiuy'),
            'role_id' => 8,
            'post_id' => 12,
            'is_owner' => true,
        ]));
    }

    public function test_readonly_tenant_can_still_read_but_not_mutate(): void
    {
        $tenant = $this->makeTenant(['subscription_status' => Tenant::STATUS_READONLY]);
        $owner = $this->tenantOwner($tenant);

        // `/dashboard` always redirects to the tenant gateway; `/selamat-datang`
        // is the office read page that actually renders.
        $this->actingAs($owner)->get('/selamat-datang')->assertOk();

        $this->actingAs($owner)
            ->post('/company/update', ['company_name' => 'Renamed'])
            ->assertStatus(403);

        $this->assertSame(
            'Teknik Mandiri',
            TenantManager::runWithoutScope(fn () => $tenant->fresh()->company_name),
        );
    }

    /** Every status outside the active set behaves as read-only. */
    public function test_unknown_subscription_status_is_treated_as_readonly(): void
    {
        $tenant = $this->makeTenant(['subscription_status' => 'EXPIRED']);
        $owner = $this->tenantOwner($tenant);

        $this->actingAs($owner)->get('/selamat-datang')->assertOk();
        $this->actingAs($owner)
            ->post('/company/update', ['company_name' => 'Renamed'])
            ->assertStatus(403);
    }

    /** @dataProvider activeStatusProvider */
    public function test_active_statuses_permit_mutations(string $status): void
    {
        $tenant = $this->makeTenant(['subscription_status' => $status]);
        $owner = $this->tenantOwner($tenant);

        $response = $this->actingAs($owner)
            ->post('/company/update', ['company_name' => 'Renamed Co']);

        $response->assertSessionHasNoErrors();
        $this->assertNotSame(403, $response->getStatusCode());
    }

    public static function activeStatusProvider(): array
    {
        return [
            'ACTIVE' => [Tenant::STATUS_ACTIVE],
            'PAID' => [Tenant::STATUS_PAID],
            'SUBSCRIBED' => [Tenant::STATUS_SUBSCRIBED],
        ];
    }

    public function test_maintenance_mode_serves_the_branded_503_page_to_tenants(): void
    {
        $tenant = $this->makeTenant();
        $owner = $this->tenantOwner($tenant);

        PlatformSetting::set('maintenance_mode', '1');
        PlatformSetting::set('maintenance_message', 'Upgrade DB, kembali 10 menit.');

        $response = $this->actingAs($owner)->get('/dashboard');

        $response->assertStatus(503);
        $response->assertInertia(fn ($page) => $page
            ->component('Errors/503')
            ->where('message', 'Upgrade DB, kembali 10 menit.')
        );
    }

    public function test_maintenance_mode_does_not_lock_out_the_superadmin_panel(): void
    {
        PlatformSetting::set('maintenance_mode', '1');
        $this->actingAsPlatformAdmin();

        $this->get('/superpowers')->assertOk();
        $this->get('/superpowers/settings')->assertOk();
    }

    public function test_settings_toggle_and_message_are_persisted_and_audited(): void
    {
        $admin = $this->actingAsPlatformAdmin();

        $this->post('/superpowers/settings/maintenance', ['enabled' => true])
            ->assertRedirect();
        $this->assertTrue(PlatformSetting::isMaintenanceMode());

        $this->post('/superpowers/settings/message', ['message' => '  Migrasi database  '])
            ->assertRedirect();
        $this->assertSame('Migrasi database', PlatformSetting::getMaintenanceMessage());

        $this->post('/superpowers/settings/maintenance', ['enabled' => false])
            ->assertRedirect();
        $this->assertFalse(PlatformSetting::isMaintenanceMode());

        $this->assertDatabaseHas('platform_activity_logs', [
            'platform_admin_id' => $admin->id,
            'action' => 'maintenance.toggled',
        ]);
        $this->assertDatabaseHas('platform_activity_logs', [
            'platform_admin_id' => $admin->id,
            'action' => 'maintenance.message_updated',
        ]);
    }

    public function test_settings_message_length_is_validated(): void
    {
        $this->actingAsPlatformAdmin();

        $this->post('/superpowers/settings/message', ['message' => str_repeat('x', 501)])
            ->assertSessionHasErrors('message');
    }

    public function test_subscriptions_index_reports_mrr_from_active_tenants_only(): void
    {
        $this->actingAsPlatformAdmin();

        $starter = Plan::where('name', 'Starter')->firstOrFail();
        $premium = Plan::create(['name' => 'Premium', 'price' => 25_000_00]);

        $this->makeTenant([
            'company_name' => 'Paying Co',
            'slug' => 'paying-co',
            'plan_id' => $premium->id,
        ]);
        $this->makeTenant([
            'company_name' => 'Lapsed Co',
            'slug' => 'lapsed-co',
            'plan_id' => $premium->id,
            'subscription_status' => Tenant::STATUS_READONLY,
        ]);
        $deleted = $this->makeTenant([
            'company_name' => 'Gone Co',
            'slug' => 'gone-co',
            'plan_id' => $premium->id,
        ]);
        TenantManager::runWithoutScope(fn () => $deleted->delete());

        // Free plan contributes nothing to MRR.
        $this->makeTenant([
            'company_name' => 'Free Co',
            'slug' => 'free-co',
            'plan_id' => $starter->id,
        ]);

        $this->get('/superpowers/subscriptions')->assertInertia(fn ($page) => $page
            ->component('Superpowers/Subscriptions/Index')
            ->where('totals.mrr_cents', 25_000_00)
            ->where('totals.active_count', 2)
            ->where('totals.readonly_count', 1)
        );
    }

    public function test_subscriptions_status_filter_narrows_the_list(): void
    {
        $this->actingAsPlatformAdmin();
        $plan = Plan::where('name', 'Starter')->firstOrFail();

        $this->makeTenant(['slug' => 'active-co', 'plan_id' => $plan->id]);
        $this->makeTenant([
            'slug' => 'readonly-co',
            'plan_id' => $plan->id,
            'subscription_status' => Tenant::STATUS_READONLY,
        ]);

        $this->get('/superpowers/subscriptions?status=readonly')->assertInertia(
            fn ($page) => $page
                ->has('subscriptions.data', 1)
                ->where('subscriptions.data.0.slug', 'readonly-co')
                ->where('subscriptions.data.0.is_readonly', true)
        );
    }

    public function test_tenants_without_a_plan_are_excluded_from_subscriptions(): void
    {
        $this->actingAsPlatformAdmin();
        $this->makeTenant(['slug' => 'planless-co']);

        $this->get('/superpowers/subscriptions')->assertInertia(
            fn ($page) => $page->has('subscriptions.data', 0)
        );
    }

    /**
     * Regression: HandleInertiaRequests overwrites the whole `flash` key that
     * AppServiceProvider shares, so warning/info toasts silently vanished even
     * though FlashMessages.tsx renders all four types.
     */
    public function test_all_four_flash_toast_types_reach_the_client(): void
    {
        $this->withSession([
            'success' => 'berhasil',
            'error' => 'gagal',
            'warning' => 'hati-hati',
            'info' => 'sekadar info',
        ])->get('/login')->assertInertia(fn ($page) => $page
            ->where('flash.success', 'berhasil')
            ->where('flash.error', 'gagal')
            ->where('flash.warning', 'hati-hati')
            ->where('flash.info', 'sekadar info')
        );
    }
}
