<?php

namespace Tests\Feature;

use App\Enums\ItemStatus;
use App\Enums\PoStatus;
use App\Models\DeliveryOrder;
use App\Models\Invoice;
use App\Models\Item;
use App\Models\Po;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Data-integrity hardening regression tests (audit 2026-08-13):
 *  - tenant-scoped unique constraints on business identifiers
 *  - hot-path indexes exist (verified via schema)
 *  - registration: slug case normalization, atomic tenant+user create,
 *    username uniqueness race handling
 *  - item/PO status vocabulary transitions (IN_PRODUCTION drift fix)
 */
class DataIntegrityTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'company_name' => 'Integrity Corp',
            'slug' => 'integrity-corp',
            'subscription_status' => 'active',
        ]);
        TenantManager::setTenantId($this->tenant->id);
    }

    // ---------------------------------------------------------------
    // Unique constraints (database-level, tenant-scoped)
    // ---------------------------------------------------------------

    public function test_duplicate_po_number_in_same_tenant_rejected_by_database(): void
    {
        Po::create(['po_number' => 'PO-DUP', 'client_name' => 'A', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);

        $this->expectException(QueryException::class);
        Po::create(['po_number' => 'PO-DUP', 'client_name' => 'B', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);
    }

    public function test_same_po_number_allowed_in_another_tenant(): void
    {
        $other = Tenant::create(['company_name' => 'Other', 'slug' => 'other-co', 'subscription_status' => 'active']);

        Po::create(['po_number' => 'PO-SHARED', 'client_name' => 'A', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);

        TenantManager::setTenantId($other->id);
        Po::create(['po_number' => 'PO-SHARED', 'client_name' => 'B', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);

        TenantManager::bypass();
        $this->assertSame(2, Po::where('po_number', 'PO-SHARED')->count());
        TenantManager::enableScope();
    }

    public function test_duplicate_do_number_and_invoice_number_rejected(): void
    {
        $po = Po::create(['po_number' => 'PO-DO-1', 'client_name' => 'A', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);

        DeliveryOrder::create(['tenant_id' => $this->tenant->id, 'po_id' => $po->id, 'do_number' => 'DO-1', 'delivery_date' => now()->toDateString()]);
        Invoice::create(['tenant_id' => $this->tenant->id, 'delivery_order_id' => null, 'invoice_number' => 'INV-1', 'total_amount' => 1000, 'status' => 'UNPAID', 'due_date' => now()->addDays(7)->toDateString(), 'invoice_type' => 'STANDARD']);

        try {
            DeliveryOrder::create(['tenant_id' => $this->tenant->id, 'po_id' => $po->id, 'do_number' => 'DO-1', 'delivery_date' => now()->toDateString()]);
            $this->fail('Duplicate do_number was accepted');
        } catch (QueryException $e) {
            $this->assertTrue(true);
        }

        try {
            Invoice::create(['tenant_id' => $this->tenant->id, 'delivery_order_id' => null, 'invoice_number' => 'INV-1', 'total_amount' => 2000, 'status' => 'UNPAID', 'due_date' => now()->addDays(7)->toDateString(), 'invoice_type' => 'STANDARD']);
            $this->fail('Duplicate invoice_number was accepted');
        } catch (QueryException $e) {
            $this->assertTrue(true);
        }
    }

    // ---------------------------------------------------------------
    // Registration integrity
    // ---------------------------------------------------------------

    private function validRegistrationPayload(array $overrides = []): array
    {
        return array_merge([
            'company_name' => 'New Corp',
            'slug' => 'newcorp',
            'name' => 'John Doe',
            'email' => 'john@newcorp.test',
            'password' => 'password1',
            'password_confirmation' => 'password1',
        ], $overrides);
    }

    public function test_registration_slug_is_case_normalized_before_uniqueness_validation(): void
    {
        Tenant::create(['company_name' => 'Existing', 'slug' => 'abc', 'subscription_status' => 'active']);

        // 'ABC' lowercases to existing 'abc' — must be a validation error, not a 500
        $response = $this->from('/register')->post('/register', $this->validRegistrationPayload(['slug' => 'ABC']));

        $response->assertSessionHasErrors('slug');
        TenantManager::bypass();
        $this->assertSame(2, Tenant::count()); // seed tenant + existing only
        TenantManager::enableScope();
    }

    public function test_registration_is_atomic_when_user_creation_fails(): void
    {
        // Existing user with the same email forces User::create to fail AFTER
        // Tenant::create — the whole operation must roll back.
        User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Existing',
            'email' => 'dupe@test.com',
            'username' => 'existing_dupe',
            'password' => bcrypt('password1'),
            'role_id' => Role::where('name', 'STAFF')->value('id'),
            'email_verified_at' => now(),
        ]);

        $tenantCountBefore = Tenant::count();

        try {
            $this->post('/register', $this->validRegistrationPayload([
                'slug' => 'atomicco',
                'email' => 'dupe@test.com',
            ]));
        } catch (QueryException $e) {
            // acceptable: surfaced as exception, but state must be clean
        }

        TenantManager::bypass();
        $this->assertSame($tenantCountBefore, Tenant::count());
        $this->assertNull(Tenant::where('slug', 'atomicco')->first());
        $this->assertSame(1, User::where('email', 'dupe@test.com')->count());
        TenantManager::enableScope();
    }

    public function test_registration_username_collision_gets_unique_suffix(): void
    {
        User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'First John',
            'email' => 'first@test.com',
            'username' => 'john.doe',
            'password' => bcrypt('password1'),
            'role_id' => Role::where('name', 'STAFF')->value('id'),
            'email_verified_at' => now(),
        ]);

        $response = $this->post('/register', $this->validRegistrationPayload([
            'slug' => 'raceco',
            'name' => 'John Doe',
            'email' => 'john@raceco.test',
        ]));

        $response->assertRedirect();

        TenantManager::bypass();
        $newOwner = User::where('email', 'john@raceco.test')->first();
        TenantManager::enableScope();

        $this->assertNotNull($newOwner);
        $this->assertNotSame('john.doe', $newOwner->username);
        $this->assertStringStartsWith('john.doe', $newOwner->username);
    }

    // ---------------------------------------------------------------
    // Status vocabulary: IN_PRODUCTION must drive PO → IN_PROGRESS
    // ---------------------------------------------------------------

    public function test_item_in_production_transitions_po_to_in_progress(): void
    {
        $po = Po::create(['po_number' => 'PO-STAT-1', 'client_name' => 'Client', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);
        $item = Item::create(['po_id' => $po->id, 'item_name' => 'Widget', 'target_qty' => 5, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'PENDING']);

        $progress = $item->itemProgresses()->where('stage_name', 'Machining')->firstOrFail();
        $progress->update(['completed_qty' => 2, 'progress_percent' => 40.00, 'status' => 'IN_PROGRESS']);

        $item->refresh();
        $po->refresh();

        $this->assertSame(ItemStatus::InProduction->value, $item->status);
        // The drift fix: IN_PRODUCTION must count as "started" for the PO.
        $this->assertSame(PoStatus::InProgress->value, $po->status);
    }

    public function test_full_completion_transitions_item_and_po_to_completed(): void
    {
        $po = Po::create(['po_number' => 'PO-STAT-2', 'client_name' => 'Client', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);
        $item = Item::create(['po_id' => $po->id, 'item_name' => 'Gadget', 'target_qty' => 2, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'PENDING']);

        $progress = $item->itemProgresses()->where('stage_name', 'Machining')->firstOrFail();
        $progress->update(['completed_qty' => 2, 'progress_percent' => 100.00, 'status' => 'COMPLETED']);

        $item->refresh();
        $po->refresh();

        $this->assertSame(ItemStatus::Completed->value, $item->status);
        $this->assertSame(PoStatus::Completed->value, $po->status);
    }

    // ---------------------------------------------------------------
    // Index presence (hot paths verified in the audit)
    // ---------------------------------------------------------------

    public function test_hot_path_indexes_exist(): void
    {
        $sm = DB::connection()->getSchemaBuilder();

        $alertIndexes = collect($sm->getIndexes('alerts'))->pluck('columns');
        $this->assertTrue($alertIndexes->contains(fn ($cols) => $cols === ['tenant_id', 'is_resolved']), 'alerts(tenant_id,is_resolved) index missing');

        $doItemIndexes = collect($sm->getIndexes('do_items'))->pluck('columns');
        $this->assertTrue($doItemIndexes->contains(fn ($cols) => $cols === ['delivery_order_id']), 'do_items(delivery_order_id) index missing');
        $this->assertTrue($doItemIndexes->contains(fn ($cols) => $cols === ['item_id']), 'do_items(item_id) index missing');
        $this->assertTrue($doItemIndexes->contains(fn ($cols) => $cols === ['tenant_id']), 'do_items(tenant_id) index missing');

        $userIndexes = collect($sm->getIndexes('users'))->pluck('columns');
        $this->assertTrue($userIndexes->contains(fn ($cols) => $cols === ['tenant_id']), 'users(tenant_id) index missing');
    }

    public function test_redundant_item_indexes_are_removed(): void
    {
        $sm = DB::connection()->getSchemaBuilder();
        $names = collect($sm->getIndexes('items'))->pluck('name');

        // Dropped by 2026_08_13_120000 (subsumed by items_tenant_status_inv_pay_index
        // under the always-on tenant scope — pure write amplification).
        foreach (['items_status_index', 'items_invoice_status_index', 'items_payment_status_index', 'items_lookup_composite_index'] as $dropped) {
            $this->assertFalse($names->contains($dropped), "{$dropped} should have been dropped");
        }

        // Kept deliberately
        foreach (['items_tenant_id_index', 'items_po_id_index', 'items_deleted_at_index', 'items_tenant_status_inv_pay_index'] as $kept) {
            $this->assertTrue($names->contains($kept), "{$kept} must be kept");
        }
    }

    public function test_status_vocabulary_matches_php_enums(): void
    {
        // The vocabulary the server writes must be exactly the enum vocabulary
        // (the same list the pgsql CHECK constraints enforce in production).
        $this->assertSame(
            ['PENDING', 'IN_PROGRESS', 'IN_PRODUCTION', 'COMPLETED', 'DELIVERED', 'CANCELLED', 'TERMINATED'],
            array_column(ItemStatus::cases(), 'value')
        );
        $this->assertSame(
            ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CLOSED', 'CANCELLED'],
            array_column(PoStatus::cases(), 'value')
        );
    }
}
