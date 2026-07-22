<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\DeliveryOrder;
use App\Models\Invoice;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantStageTemplate;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantScopeAuditTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected User $userB;
    protected Role $officeRole;
    protected Role $workerRole;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create two isolated tenants
        $this->tenantA = Tenant::create([
            'company_name' => 'Workshop Alpha',
            'slug' => 'workshop-alpha',
            'subscription_status' => 'active',
        ]);

        $this->tenantB = Tenant::create([
            'company_name' => 'Workshop Beta',
            'slug' => 'workshop-beta',
            'subscription_status' => 'active',
        ]);

        // 2. Create roles
        $this->officeRole = Role::create([
            'name' => 'STAFF',
            'level' => 'office',
            'display_name' => 'Office Staff',
        ]);

        $this->workerRole = Role::create([
            'name' => 'WORKER',
            'level' => 'production',
            'display_name' => 'Production Worker',
        ]);

        // 3. Create users in Tenant A and Tenant B
        TenantManager::setTenantId($this->tenantA->id);
        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Alice Admin (Tenant A)',
            'email' => 'alice@alpha.com',
            'username' => 'alice_alpha',
            'password' => bcrypt('password123'),
            'role_id' => $this->officeRole->id,
            'is_owner' => false,
        ]);

        TenantManager::setTenantId($this->tenantB->id);
        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Bob Admin (Tenant B)',
            'email' => 'bob@beta.com',
            'username' => 'bob_beta',
            'password' => bcrypt('password123'),
            'role_id' => $this->officeRole->id,
            'is_owner' => false,
        ]);

        TenantManager::enableScope();
    }

    public function test_eloquent_models_strict_tenant_scoping()
    {
        // Populate records under Tenant A
        TenantManager::setTenantId($this->tenantA->id);
        $poA = Po::create(['po_number' => 'PO-ALPHA-01', 'client_name' => 'Client Alpha', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);
        $itemA = Item::create(['po_id' => $poA->id, 'item_name' => 'Gear Shaft A', 'target_qty' => 10, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'PENDING']);
        $doA = DeliveryOrder::create(['po_id' => $poA->id, 'do_number' => 'DO-ALPHA-01', 'delivery_date' => now()]);
        $alertA = Alert::create(['item_id' => $itemA->id, 'severity' => 'RED', 'reason_type' => 'STUCK', 'message' => 'Tool broken', 'is_resolved' => false]);
        $templateA = TenantStageTemplate::create(['name' => 'Standard Alpha Template', 'stages' => ['Design', 'Machining']]);

        // Populate records under Tenant B
        TenantManager::setTenantId($this->tenantB->id);
        $poB = Po::create(['po_number' => 'PO-BETA-01', 'client_name' => 'Client Beta', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);
        $itemB = Item::create(['po_id' => $poB->id, 'item_name' => 'Flange B', 'target_qty' => 5, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Fabrication'], 'status' => 'PENDING']);
        $doB = DeliveryOrder::create(['po_id' => $poB->id, 'do_number' => 'DO-BETA-01', 'delivery_date' => now()]);
        $alertB = Alert::create(['item_id' => $itemB->id, 'severity' => 'YELLOW', 'reason_type' => 'DELAY', 'message' => 'Material delayed', 'is_resolved' => false]);
        $templateB = TenantStageTemplate::create(['name' => 'Custom Beta Template', 'stages' => ['Material', 'Fabrication']]);

        // 1. Assert Tenant A view
        TenantManager::setTenantId($this->tenantA->id);
        $this->assertEquals(1, Po::count());
        $this->assertEquals('PO-ALPHA-01', Po::first()->po_number);
        $this->assertEquals(1, Item::count());
        $this->assertEquals('Gear Shaft A', Item::first()->item_name);
        $this->assertEquals(1, DeliveryOrder::count());
        $this->assertEquals('DO-ALPHA-01', DeliveryOrder::first()->do_number);
        $this->assertEquals(1, Alert::count());
        $this->assertEquals('Tool broken', Alert::first()->message);
        $this->assertEquals(1, TenantStageTemplate::count());
        $this->assertEquals('Standard Alpha Template', TenantStageTemplate::first()->name);

        // 2. Assert Tenant B view
        TenantManager::setTenantId($this->tenantB->id);
        $this->assertEquals(1, Po::count());
        $this->assertEquals('PO-BETA-01', Po::first()->po_number);
        $this->assertEquals(1, Item::count());
        $this->assertEquals('Flange B', Item::first()->item_name);
        $this->assertEquals(1, DeliveryOrder::count());
        $this->assertEquals('DO-BETA-01', DeliveryOrder::first()->do_number);
        $this->assertEquals(1, Alert::count());
        $this->assertEquals('Material delayed', Alert::first()->message);
        $this->assertEquals(1, TenantStageTemplate::count());
        $this->assertEquals('Custom Beta Template', TenantStageTemplate::first()->name);

        // 3. Bypass test
        TenantManager::bypass();
        $this->assertEquals(2, Po::count());
        $this->assertEquals(2, Item::count());
        $this->assertEquals(2, DeliveryOrder::count());
        $this->assertEquals(2, Alert::count());
        $this->assertEquals(2, TenantStageTemplate::count());
        TenantManager::enableScope();
    }

    public function test_cross_tenant_item_cancellation_prevented()
    {
        // Tenant B item
        TenantManager::setTenantId($this->tenantB->id);
        $poB = Po::create(['po_number' => 'PO-BETA-CANCEL', 'client_name' => 'Client Beta', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);
        $itemB = Item::create(['po_id' => $poB->id, 'item_name' => 'Target Item Beta', 'target_qty' => 5, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'PENDING']);

        // User A attempts to cancel Tenant B item
        $this->actingAs($this->userA);
        TenantManager::setTenantId($this->tenantA->id);

        $response = $this->post("/items/{$itemB->id}/cancel");
        $response->assertStatus(404);

        $itemB->refresh();
        $this->assertEquals('PENDING', $itemB->status);
    }

    public function test_cross_tenant_user_update_and_deletion_prevented()
    {
        // User A attempts to update or delete User B
        $this->actingAs($this->userA);
        TenantManager::setTenantId($this->tenantA->id);

        $updateResponse = $this->post("/users/{$this->userB->id}/update", [
            'name' => 'Hacked Name',
            'role_id' => $this->officeRole->id,
            'username' => 'hacked_username',
            'login_method' => 'PASSWORD',
        ]);
        $updateResponse->assertStatus(404);

        $deleteResponse = $this->post("/users/{$this->userB->id}/delete");
        $deleteResponse->assertStatus(404);

        $this->userB->refresh();
        $this->assertEquals('Bob Admin (Tenant B)', $this->userB->name);
    }

    public function test_cross_tenant_pin_reset_approval_prevented()
    {
        // Alert created under Tenant B
        TenantManager::setTenantId($this->tenantB->id);
        $alertB = Alert::create([
            'item_id' => 0,
            'severity' => 'BLUE',
            'message' => "PIN Reset Requested for {$this->userB->name} (ID:{$this->userB->id}) by worker.",
            'is_resolved' => false,
        ]);

        // Admin A attempts to approve Tenant B PIN reset
        $this->actingAs($this->userA);
        TenantManager::setTenantId($this->tenantA->id);

        $response = $this->post("/pin-reset/{$alertB->id}/approve");
        $response->assertStatus(404);

        $alertB->refresh();
        $this->assertFalse($alertB->is_resolved);
    }

    public function test_cross_tenant_worker_dashboard_access_blocked()
    {
        // User A logged in, attempts to access Tenant B worker dashboard /c/workshop-beta
        $this->actingAs($this->userA);

        $response = $this->get('/c/workshop-beta');
        $response->assertStatus(403);
    }

    public function test_cross_tenant_worker_progress_update_prevented()
    {
        // Progress created under Tenant B
        TenantManager::setTenantId($this->tenantB->id);
        $poB = Po::create(['po_number' => 'PO-BETA-PROG', 'client_name' => 'Client Beta', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);
        $itemB = Item::create(['po_id' => $poB->id, 'item_name' => 'Item Beta Prog', 'target_qty' => 10, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'PENDING']);
        $progressB = $itemB->itemProgresses()->first();

        // User A attempts to update progress on Tenant B's item via route /c/workshop-beta/progress/{progressB->id}/update
        $this->actingAs($this->userA);

        $response = $this->post("/c/workshop-beta/progress/{$progressB->id}/update", [
            'completed_qty' => 5,
        ]);
        $response->assertStatus(403);

        $progressB->refresh();
        $this->assertEquals(0, $progressB->completed_qty);
    }

    public function test_cross_tenant_websocket_broadcasting_channels_blocked()
    {
        $this->actingAs($this->userA);

        // 1. Dashboard private channel of Tenant B
        $resDash = $this->post('/broadcasting/auth', [
            'channel_name' => 'private-tenant.'.$this->tenantB->id.'.dashboard',
            'socket_id' => '1234.5678',
        ]);
        $resDash->assertStatus(403);

        // 2. Workers private channel of Tenant B
        $resWork = $this->post('/broadcasting/auth', [
            'channel_name' => 'private-tenant.'.$this->tenantB->id.'.workers',
            'socket_id' => '1234.5678',
        ]);
        $resWork->assertStatus(403);

        // 3. Presence channel of Tenant B
        $resPres = $this->post('/broadcasting/auth', [
            'channel_name' => 'presence-tenant.'.$this->tenantB->id.'.presence',
            'socket_id' => '1234.5678',
        ]);
        $resPres->assertStatus(403);
    }

    public function test_automatic_tenant_id_population_on_model_creation()
    {
        TenantManager::setTenantId($this->tenantA->id);

        $po = Po::create(['po_number' => 'PO-AUTO-01', 'client_name' => 'Client Auto', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);
        $this->assertEquals($this->tenantA->id, $po->tenant_id);

        $item = Item::create(['po_id' => $po->id, 'item_name' => 'Item Auto', 'target_qty' => 5, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'PENDING']);
        $this->assertEquals($this->tenantA->id, $item->tenant_id);

        $progress = $item->itemProgresses()->first();
        $this->assertEquals($this->tenantA->id, $progress->tenant_id);
    }
}
