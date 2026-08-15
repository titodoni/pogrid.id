<?php

namespace Tests\Feature\Superpowers;

use App\Models\Item;
use App\Models\Plan;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

class SuperpowersTenantManagementTest extends SuperpowersTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsPlatformAdmin();
    }

    public function test_index_lists_tenants_across_all_tenancies(): void
    {
        $this->makeTenant(['company_name' => 'Alpha Co', 'slug' => 'alpha-co']);
        $this->makeTenant(['company_name' => 'Beta Works', 'slug' => 'beta-works']);

        $this->get('/superpowers/tenants')->assertInertia(fn ($page) => $page
            ->component('Superpowers/Tenants/Index')
            ->has('tenants.data', 2)
        );
    }

    public function test_index_search_filters_by_company_and_slug(): void
    {
        $this->makeTenant(['company_name' => 'Alpha Co', 'slug' => 'alpha-co']);
        $this->makeTenant(['company_name' => 'Beta Works', 'slug' => 'beta-works']);

        $this->get('/superpowers/tenants?search=beta')->assertInertia(fn ($page) => $page
            ->has('tenants.data', 1)
            ->where('tenants.data.0.slug', 'beta-works')
        );
    }

    public function test_index_status_filter_separates_active_readonly_and_deleted(): void
    {
        $this->makeTenant(['company_name' => 'Active Co', 'slug' => 'active-co']);
        $this->makeTenant([
            'company_name' => 'Readonly Co',
            'slug' => 'readonly-co',
            'subscription_status' => Tenant::STATUS_READONLY,
        ]);
        $deleted = $this->makeTenant(['company_name' => 'Gone Co', 'slug' => 'gone-co']);
        TenantManager::runWithoutScope(fn () => $deleted->delete());

        $this->get('/superpowers/tenants?status=active')->assertInertia(fn ($page) => $page
            ->has('tenants.data', 1)
            ->where('tenants.data.0.slug', 'active-co')
        );

        $this->get('/superpowers/tenants?status=readonly')->assertInertia(fn ($page) => $page
            ->has('tenants.data', 1)
            ->where('tenants.data.0.slug', 'readonly-co')
        );

        $this->get('/superpowers/tenants?status=deleted')->assertInertia(fn ($page) => $page
            ->has('tenants.data', 1)
            ->where('tenants.data.0.slug', 'gone-co')
        );
    }

    public function test_store_creates_tenant_and_audits(): void
    {
        $this->post('/superpowers/tenants', [
            'company_name' => 'Gamma Fab',
            'slug' => 'gamma-fab',
            'plan_id' => $this->starterPlanId(),
            'subscription_status' => Tenant::STATUS_ACTIVE,
        ])->assertRedirect();

        $tenant = TenantManager::runWithoutScope(
            fn () => Tenant::where('slug', 'gamma-fab')->firstOrFail()
        );

        $this->assertDatabaseHas('platform_activity_logs', [
            'action' => 'tenant.created',
            'target_id' => $tenant->id,
        ]);
    }

    public function test_store_rejects_duplicate_slug_and_invalid_status(): void
    {
        $this->makeTenant(['slug' => 'taken-slug']);

        $this->post('/superpowers/tenants', [
            'company_name' => 'Dupe',
            'slug' => 'taken-slug',
            'plan_id' => $this->starterPlanId(),
            'subscription_status' => Tenant::STATUS_ACTIVE,
        ])->assertSessionHasErrors('slug');

        $this->post('/superpowers/tenants', [
            'company_name' => 'Bad Status',
            'slug' => 'bad-status',
            'plan_id' => $this->starterPlanId(),
            'subscription_status' => 'WHATEVER',
        ])->assertSessionHasErrors('subscription_status');
    }

    public function test_store_rejects_uppercase_slug(): void
    {
        $this->post('/superpowers/tenants', [
            'company_name' => 'Shouty',
            'slug' => 'Shouty-Co',
            'plan_id' => $this->starterPlanId(),
            'subscription_status' => Tenant::STATUS_ACTIVE,
        ])->assertSessionHasErrors('slug');
    }

    public function test_show_reports_users_and_analytics(): void
    {
        $tenant = $this->makeTenant();

        TenantManager::runWithoutScope(function () use ($tenant) {
            User::create([
                'tenant_id' => $tenant->id,
                'name' => 'Sari Dewi',
                'email' => 'sari@teknik.test',
                'email_verified_at' => now(),
                'password' => Hash::make('poiuy'),
                'role_id' => 8,
                'post_id' => 12,
            ]);

            Po::create([
                'tenant_id' => $tenant->id,
                'po_number' => 'PO-1',
                'client_name' => 'Client',
                'global_deadline' => now()->addDays(5),
                'status' => 'PENDING',
            ]);
        });

        $this->get("/superpowers/tenants/{$tenant->id}")->assertInertia(fn ($page) => $page
            ->component('Superpowers/Tenants/Show')
            ->where('tenant.slug', 'teknik-mandiri')
            ->has('users.data', 1)
            ->where('analytics.resources.users_count', 1)
            ->where('analytics.resources.table_breakdown.pos', 1)
        );
    }

    public function test_update_changes_status_and_plan(): void
    {
        $tenant = $this->makeTenant();
        $premium = Plan::create(['name' => 'Premium', 'price' => 25_000_00]);

        $this->put("/superpowers/tenants/{$tenant->id}", [
            'company_name' => 'Teknik Mandiri Jaya',
            'slug' => 'teknik-mandiri',
            'plan_id' => $premium->id,
            'subscription_status' => Tenant::STATUS_READONLY,
        ])->assertRedirect();

        $fresh = TenantManager::runWithoutScope(fn () => $tenant->fresh());

        $this->assertSame('Teknik Mandiri Jaya', $fresh->company_name);
        $this->assertSame($premium->id, $fresh->plan_id);
        $this->assertTrue($fresh->isReadonly());
    }

    public function test_suspend_puts_tenant_into_readonly_and_activate_restores_it(): void
    {
        $tenant = $this->makeTenant();

        $this->post("/superpowers/tenants/{$tenant->id}/suspend")->assertRedirect();
        $this->assertTrue(
            TenantManager::runWithoutScope(fn () => $tenant->fresh()->isReadonly())
        );
        $this->assertDatabaseHas('platform_activity_logs', ['action' => 'tenant.suspended']);

        $this->post("/superpowers/tenants/{$tenant->id}/activate")->assertRedirect();
        $this->assertTrue(
            TenantManager::runWithoutScope(fn () => $tenant->fresh()->hasActiveSubscription())
        );
        $this->assertDatabaseHas('platform_activity_logs', ['action' => 'tenant.activated']);
    }

    public function test_destroy_soft_deletes_and_restore_brings_tenant_back(): void
    {
        $tenant = $this->makeTenant();

        $this->delete("/superpowers/tenants/{$tenant->id}")->assertRedirect('/superpowers/tenants');
        $this->assertSoftDeleted('tenants', ['id' => $tenant->id]);

        $this->post("/superpowers/tenants/{$tenant->id}/restore")->assertRedirect();
        $this->assertDatabaseHas('tenants', ['id' => $tenant->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('platform_activity_logs', ['action' => 'tenant.restored']);
    }

    /**
     * Regression: the resource routes originally resolved without withTrashed(),
     * so a soft-deleted tenant 404'd and could never be inspected or restored
     * from its own detail page.
     */
    public function test_soft_deleted_tenant_remains_viewable_and_editable(): void
    {
        $tenant = $this->makeTenant();
        TenantManager::runWithoutScope(fn () => $tenant->delete());

        $this->get("/superpowers/tenants/{$tenant->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('tenant.id', $tenant->id));

        $this->get("/superpowers/tenants/{$tenant->id}/edit")->assertOk();
    }

    public function test_items_and_pos_of_other_tenants_are_not_counted(): void
    {
        $alpha = $this->makeTenant(['company_name' => 'Alpha Co', 'slug' => 'alpha-co']);
        $beta = $this->makeTenant(['company_name' => 'Beta Co', 'slug' => 'beta-co']);

        TenantManager::runWithoutScope(function () use ($alpha, $beta) {
            foreach ([$alpha, $beta] as $index => $tenant) {
                $po = Po::create([
                    'tenant_id' => $tenant->id,
                    'po_number' => 'PO-'.$index,
                    'client_name' => 'Client',
                    'global_deadline' => now()->addDays(5),
                    'status' => 'PENDING',
                ]);

                Item::create([
                    'tenant_id' => $tenant->id,
                    'po_id' => $po->id,
                    'item_name' => 'Part '.$index,
                    'target_qty' => 1,
                    'item_type' => 'MANUFACTURE',
                    'required_stages' => ['Machining'],
                    'status' => 'PENDING',
                ]);
            }
        });

        $this->get("/superpowers/tenants/{$alpha->id}")->assertInertia(
            fn ($page) => $page->where('analytics.resources.table_breakdown.pos', 1)
        );
    }

    public function test_unauthenticated_admin_cannot_mutate_tenants(): void
    {
        $tenant = $this->makeTenant();

        // Drop the platform session established in setUp().
        $this->flushSession();
        auth('platform')->logout();

        $this->post("/superpowers/tenants/{$tenant->id}/suspend")
            ->assertRedirect('/superpowers/login');

        $this->assertTrue(
            TenantManager::runWithoutScope(fn () => $tenant->fresh()->hasActiveSubscription())
        );
    }
}
