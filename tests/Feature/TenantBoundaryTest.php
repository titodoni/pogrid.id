<?php

namespace Tests\Feature;

use App\Exceptions\TenantContextMissingException;
use App\Jobs\GenerateSunkCostInvoiceJob;
use App\Models\DeliveryOrder;
use App\Models\DoItem;
use App\Models\Item;
use App\Models\Po;
use App\Models\Tenant;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tenant boundary hardening (audit 2026-08-13):
 * fail-closed scope, explicit bypass, nest-safe state restore, do_items tenancy.
 */
class TenantBoundaryTest extends TestCase
{
    use RefreshDatabase;

    private function makeTenantWithItem(string $slug): array
    {
        TenantManager::runWithoutScope(function () use ($slug) {
            Tenant::create(['company_name' => ucfirst($slug), 'slug' => $slug, 'subscription_status' => 'active']);
        });
        $tenant = TenantManager::runWithoutScope(fn () => Tenant::where('slug', $slug)->firstOrFail());
        TenantManager::setTenantId($tenant->id);
        $po = Po::create(['po_number' => 'PO-'.$slug, 'client_name' => 'Client', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);
        $item = Item::create(['po_id' => $po->id, 'item_name' => 'Part '.$slug, 'target_qty' => 2, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'PENDING']);

        return [$tenant, $po, $item];
    }

    public function test_scoped_query_without_context_throws(): void
    {
        TenantManager::setTenantId(null);

        $this->expectException(TenantContextMissingException::class);
        Item::query()->count();
    }

    public function test_explicit_bypass_allows_cross_tenant_read_and_restores_state(): void
    {
        [$tenantA] = $this->makeTenantWithItem('alpha-co');
        [$tenantB, $poB] = $this->makeTenantWithItem('beta-co');

        TenantManager::setTenantId($tenantA->id);
        $this->assertSame(1, Po::count()); // scoped: only A visible

        $all = TenantManager::runWithoutScope(fn () => Po::count());
        $this->assertSame(2, $all); // explicit cross-tenant operation

        // State restored: not bypassed, still tenant A
        $this->assertFalse(TenantManager::isBypassed());
        $this->assertSame($tenantA->id, TenantManager::getTenantId());
        $this->assertSame(1, Po::count());
    }

    public function test_run_without_scope_restores_state_after_exception(): void
    {
        [$tenantA] = $this->makeTenantWithItem('gamma-co');
        TenantManager::setTenantId($tenantA->id);

        try {
            TenantManager::runWithoutScope(function () {
                throw new \RuntimeException('boom');
            });
            $this->fail('exception expected');
        } catch (\RuntimeException $e) {
            // expected
        }

        $this->assertFalse(TenantManager::isBypassed());
        $this->assertSame($tenantA->id, TenantManager::getTenantId());
    }

    public function test_sunk_cost_job_does_not_corrupt_surrounding_tenant_state(): void
    {
        [$tenantA, $poA, $itemA] = $this->makeTenantWithItem('delta-co');
        [$tenantB] = $this->makeTenantWithItem('epsilon-co');

        // Simulate a caller that already bypassed the scope (nested-bypass case)
        TenantManager::setTenantId($tenantB->id);
        TenantManager::bypass();

        (new GenerateSunkCostInvoiceJob($itemA->id, 3))->handle();

        // Job wrote tenant A's invoice...
        $this->assertDatabaseHas('invoices', ['tenant_id' => $tenantA->id, 'invoice_type' => 'SUNK_COST']);

        // ...and the caller's bypassed tenant-B context survived intact
        $this->assertTrue(TenantManager::isBypassed());
        $this->assertSame($tenantB->id, TenantManager::getTenantId());
    }

    public function test_timeline_command_restores_tenant_state(): void
    {
        [$tenantA] = $this->makeTenantWithItem('zeta-co');
        TenantManager::setTenantId($tenantA->id);

        $this->artisan('pogrid:evaluate-timelines')->assertSuccessful();

        $this->assertFalse(TenantManager::isBypassed());
        $this->assertSame($tenantA->id, TenantManager::getTenantId());
    }

    public function test_auth_user_provider_resolves_without_tenant_context(): void
    {
        [, , $item] = $this->makeTenantWithItem('iota-co');
        $userId = \App\Models\User::create([
            'email_verified_at' => now(),
            'tenant_id' => $item->tenant_id,
            'name' => 'Session User',
            'username' => 'session_user_iota',
            'email' => 'session@iota.test',
            'password' => bcrypt('password123'),
            'role_id' => \App\Models\Role::firstOrCreate(['name' => 'STAFF'], ['level' => 'office', 'display_name' => 'Staff'])->id,
        ])->id;

        // Session layer resolves users before SetTenant runs (e.g. session GC
        // lottery). Identity lookup must not trip the fail-closed scope.
        TenantManager::setTenantId(null);

        $provider = app('auth')->createUserProvider('users');
        $resolved = $provider->retrieveById($userId);

        $this->assertNotNull($resolved);
        $this->assertFalse(TenantManager::isBypassed());
        $this->assertNull(TenantManager::getTenantId());
    }

    public function test_do_items_are_tenant_scoped_and_auto_filled(): void
    {
        [$tenantA, $poA, $itemA] = $this->makeTenantWithItem('eta-co');
        [$tenantB, $poB, $itemB] = $this->makeTenantWithItem('theta-co');

        TenantManager::setTenantId($tenantA->id);
        $do = DeliveryOrder::create(['tenant_id' => $tenantA->id, 'po_id' => $poA->id, 'do_number' => 'DO-ETA-1', 'delivery_date' => now()->toDateString()]);
        $doItem = DoItem::create(['delivery_order_id' => $do->id, 'item_id' => $itemA->id, 'delivered_qty' => 1]);

        // tenant_id auto-filled from context
        $this->assertSame($tenantA->id, $doItem->tenant_id);

        // Scoped: tenant A sees only its own do_items
        $this->assertSame(1, DoItem::count());

        // Tenant B sees none of A's delivery items
        TenantManager::setTenantId($tenantB->id);
        $this->assertSame(0, DoItem::count());
    }
}
