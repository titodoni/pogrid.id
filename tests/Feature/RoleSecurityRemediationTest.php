<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\Item;
use App\Models\Po;
use App\Models\Post;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RoleSecurityRemediationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Role $staffRole;

    protected Role $workerRole;

    protected Post $salesPost;

    protected Post $managerPost;

    protected Post $adminPost;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'company_name' => 'Secure Tech',
            'slug' => 'secure-tech',
        ]);

        $this->staffRole = Role::firstOrCreate(['name' => 'STAFF'], ['level' => 'office', 'display_name' => 'Office Staff']);
        $this->workerRole = Role::firstOrCreate(['name' => 'MACHINING'], ['level' => 'production', 'display_name' => 'Machining Operator']);

        $this->salesPost = Post::firstOrCreate(['name' => 'Sales'], ['display_name' => 'Sales Representative']);
        $this->managerPost = Post::firstOrCreate(['name' => 'Manager'], ['display_name' => 'General Manager']);
        $this->adminPost = Post::firstOrCreate(['name' => 'Admin'], ['display_name' => 'System Administrator']);
    }

    public function test_sales_user_is_blocked_from_creating_pos_and_managing_users(): void
    {
        $salesUser = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Sarah Sales',
            'username' => 'sarah_sales',
            'password' => Hash::make('password'),
            'role_id' => $this->staffRole->id,
            'post_id' => $this->salesPost->id,
            'is_owner' => false,
        ]);

        $this->actingAs($salesUser);
        TenantManager::setTenantId($this->tenant->id);

        // Attempt PO creation
        $poResponse = $this->post('/pos', [
            'po_number' => 'PO-SALES-01',
            'client_name' => 'Client X',
            'items' => [],
        ]);
        $poResponse->assertStatus(403);

        // Attempt user creation
        $userResponse = $this->post('/users', [
            'login_method' => 'PASSWORD',
            'name' => 'New Guy',
            'role_id' => $this->staffRole->id,
            'username' => 'new_guy',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);
        $userResponse->assertStatus(403);
    }

    public function test_manager_cannot_create_pos_but_can_terminate_production_item(): void
    {
        $managerUser = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Mike Manager',
            'username' => 'mike_manager',
            'password' => Hash::make('password'),
            'role_id' => $this->staffRole->id,
            'post_id' => $this->managerPost->id,
            'is_owner' => false,
        ]);

        $this->actingAs($managerUser);
        TenantManager::setTenantId($this->tenant->id);

        // Attempt PO creation (Should block)
        $poResponse = $this->post('/pos', [
            'po_number' => 'PO-MANAGER-01',
            'client_name' => 'Client Y',
            'items' => [],
        ]);
        $poResponse->assertStatus(403);

        // Terminate an active item (Should succeed as Manager has executive capabilities)
        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-TEST-01',
            'client_name' => 'Client Z',
            'global_deadline' => now()->addWeek()->toDateString(),
            'status' => 'IN_PROGRESS',
        ]);
        $item = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Engine Block',
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'QC'],
            'target_qty' => 10,
            'progress_percent' => 20.00,
            'status' => 'IN_PROGRESS',
        ]);

        $terminateResponse = $this->post("/items/{$item->id}/terminate");
        $terminateResponse->assertStatus(302);
        $this->assertEquals('TERMINATED', $item->refresh()->status);
    }

    public function test_floor_worker_cannot_see_admin_blue_alerts_in_trouble_reports(): void
    {
        TenantManager::setTenantId($this->tenant->id);

        $worker = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Willy Worker',
            'pin' => Hash::make('1234'),
            'role_id' => $this->workerRole->id,
            'is_owner' => false,
        ]);

        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-ALERT-01',
            'client_name' => 'Client Alert',
            'global_deadline' => now()->addWeek()->toDateString(),
            'status' => 'IN_PROGRESS',
        ]);
        $item = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Shaft',
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'QC'],
            'target_qty' => 5,
            'status' => 'IN_PROGRESS',
        ]);

        // Create RED kendala alert and BLUE admin alert (PIN reset)
        Alert::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $item->id,
            'severity' => 'RED',
            'reason_type' => 'Kendala',
            'message' => 'Machine broken',
            'is_resolved' => false,
        ]);

        Alert::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $item->id,
            'severity' => 'BLUE',
            'reason_type' => 'PIN_RESET',
            'message' => 'PIN reset requested',
            'is_resolved' => false,
        ]);

        $this->actingAs($worker);
        TenantManager::setTenantId($this->tenant->id);

        $response = $this->get("/c/{$this->tenant->slug}/trouble-reports");
        $response->assertStatus(200);

        $page = $response->viewData('page');
        $alerts = $page['props']['alerts'];

        $this->assertCount(1, $alerts);
        $this->assertEquals('RED', $alerts[0]['severity']);
    }

    public function test_alert_resolution_permissions(): void
    {
        TenantManager::setTenantId($this->tenant->id);

        $worker = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Ordinary Worker',
            'pin' => Hash::make('5555'),
            'role_id' => $this->workerRole->id,
            'is_owner' => false,
        ]);

        $ppicRole = Role::firstOrCreate(['name' => 'PPIC'], ['level' => 'production', 'display_name' => 'PPIC Control']);
        $ppicUser = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Paul PPIC',
            'pin' => Hash::make('6666'),
            'role_id' => $ppicRole->id,
            'is_owner' => false,
        ]);

        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-RESOLVE-01',
            'client_name' => 'Client Resolve',
            'global_deadline' => now()->addWeek()->toDateString(),
            'status' => 'IN_PROGRESS',
        ]);
        $item = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Gearbox',
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'QC'],
            'target_qty' => 5,
            'status' => 'IN_PROGRESS',
        ]);
        $alert = Alert::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $item->id,
            'severity' => 'RED',
            'reason_type' => 'Kendala',
            'message' => 'Stuck at stage',
            'is_resolved' => false,
        ]);

        // Standard worker tries to resolve -> 403
        $this->actingAs($worker);
        TenantManager::setTenantId($this->tenant->id);
        $workerResp = $this->post("/c/{$this->tenant->slug}/alerts/{$alert->id}/resolve");
        $workerResp->assertStatus(403);
        $this->assertFalse((bool) $alert->refresh()->is_resolved);

        // PPIC user resolves -> success
        $this->actingAs($ppicUser);
        $ppicResp = $this->post("/c/{$this->tenant->slug}/alerts/{$alert->id}/resolve");
        $ppicResp->assertStatus(302);
        $this->assertTrue((bool) $alert->refresh()->is_resolved);
    }

    public function test_finance_ledger_access_and_purchasing_vendor_monitoring(): void
    {
        TenantManager::setTenantId($this->tenant->id);

        $financeRole = Role::firstOrCreate(['name' => 'FINANCE'], ['level' => 'production', 'display_name' => 'Finance Control']);
        $financeUser = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Fiona Finance',
            'pin' => Hash::make('7777'),
            'role_id' => $financeRole->id,
            'is_owner' => false,
        ]);

        $purchasingRole = Role::firstOrCreate(['name' => 'PURCHASING'], ['level' => 'production', 'display_name' => 'Purchasing Agent']);
        $purchasingUser = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Peter Purchasing',
            'pin' => Hash::make('8888'),
            'role_id' => $purchasingRole->id,
            'is_owner' => false,
        ]);

        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-FIN-01',
            'client_name' => 'Client Fin',
            'global_deadline' => now()->addWeek()->toDateString(),
            'status' => 'IN_PROGRESS',
        ]);
        $item = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Raw Steel (BUY_OUT)',
            'item_type' => 'BUY_OUT',
            'required_stages' => ['Material'],
            'target_qty' => 50,
            'status' => 'IN_PROGRESS',
        ]);

        // Finance user views ledger
        $this->actingAs($financeUser);
        TenantManager::setTenantId($this->tenant->id);

        $finResp = $this->get("/c/{$this->tenant->slug}/finance-ledger");
        $finResp->assertStatus(200);
        $finResp->assertInertia(fn ($page) => $page->component('Worker/FinanceLedger'));

        // Purchasing user updates vendor status & metadata
        $this->actingAs($purchasingUser);
        $purchResp = $this->post("/c/{$this->tenant->slug}/items/{$item->id}/purchasing-status", [
            'purchasing_status' => 'PROSES',
            'vendor_name' => 'PT Baja Maju',
            'vendor_po' => 'VPO-999',
            'eta_date' => '2026-08-15',
        ]);
        $purchResp->assertStatus(302);

        $item->refresh();
        $this->assertEquals('PROSES', $item->purchasing_status);
        $this->assertEquals('PT Baja Maju', $item->vendor_name);
        $this->assertEquals('VPO-999', $item->vendor_po);
        $this->assertEquals('2026-08-15', $item->eta_date);
    }

    public function test_admin_trial_enforcement_and_billing_screen(): void
    {
        $adminRole = Role::firstOrCreate(['name' => 'ADMIN'], ['level' => 'office', 'display_name' => 'Admin']);
        $adminUser = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Alice Admin',
            'email' => 'alice@mandiri.co',
            'password' => Hash::make('secret123'),
            'role_id' => $adminRole->id,
            'is_owner' => false,
        ]);

        $this->actingAs($adminUser);
        TenantManager::setTenantId($this->tenant->id);

        // Expire trial and ensure subscription is not active
        $this->tenant->update([
            'trial_ends_at' => now()->subDay(),
            'subscription_status' => 'TRIAL',
        ]);

        // Attempting to create PO when trial expired should return 403
        $resp = $this->post('/pos', [
            'po_number' => 'PO-LOCKED',
            'client_name' => 'Client X',
            'global_deadline' => '2026-09-01',
            'items' => [
                [
                    'item_name' => 'Part A',
                    'target_qty' => 10,
                    'item_type' => 'MANUFACTURED',
                    'required_stages' => ['CNC'],
                ],
            ],
        ]);
        $resp->assertStatus(403);

        // Viewing Billing screen should succeed and show is_expired = true
        $billResp = $this->get('/dashboard/billing');
        $billResp->assertStatus(200);
        $billResp->assertInertia(fn ($page) => $page->component('Owner/Billing')->where('is_expired', true));

        // Activating subscription restores PO creation ability
        $this->tenant->update(['subscription_status' => 'ACTIVE']);
        $respSuccess = $this->post('/pos', [
            'po_number' => 'PO-UNLOCKED',
            'client_name' => 'Client X',
            'global_deadline' => '2026-09-01',
            'items' => [
                [
                    'item_name' => 'Part A',
                    'target_qty' => 10,
                    'item_type' => 'MANUFACTURED',
                    'required_stages' => ['CNC'],
                ],
            ],
        ]);
        $respSuccess->assertStatus(302);
    }

    public function test_non_owner_cannot_update_or_delete_owner_account(): void
    {
        $owner = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Boss Owner',
            'username' => 'boss_owner',
            'password' => Hash::make('password'),
            'role_id' => $this->staffRole->id,
            'post_id' => $this->adminPost->id,
            'is_owner' => true,
        ]);

        $adminUser = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Alice Admin',
            'username' => 'alice_admin',
            'password' => Hash::make('password'),
            'role_id' => $this->staffRole->id,
            'post_id' => $this->adminPost->id,
            'is_owner' => false,
        ]);

        $this->actingAs($adminUser);
        TenantManager::setTenantId($this->tenant->id);

        // Admin must not be able to modify the owner account (e.g. change password/role)
        $updateResp = $this->post("/users/{$owner->id}/update", [
            'login_method' => 'PASSWORD',
            'name' => 'Hijacked Owner',
            'role_id' => $this->staffRole->id,
            'username' => 'boss_owner',
            'password' => 'pwn3d123',
            'password_confirmation' => 'pwn3d123',
        ]);
        $updateResp->assertStatus(403);

        $this->assertEquals('Boss Owner', $owner->refresh()->name);

        // Admin must not be able to delete the owner account
        $deleteResp = $this->post("/users/{$owner->id}/delete");
        $deleteResp->assertStatus(403);

        $this->assertDatabaseHas('users', ['id' => $owner->id]);
    }

    public function test_owner_can_update_non_owner_admin(): void
    {
        $owner = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Boss Owner',
            'username' => 'boss_owner',
            'password' => Hash::make('password'),
            'role_id' => $this->staffRole->id,
            'post_id' => $this->adminPost->id,
            'is_owner' => true,
        ]);

        $adminUser = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Alice Admin',
            'username' => 'alice_admin',
            'password' => Hash::make('password'),
            'role_id' => $this->staffRole->id,
            'post_id' => $this->adminPost->id,
            'is_owner' => false,
        ]);

        $this->actingAs($owner);
        TenantManager::setTenantId($this->tenant->id);

        $updateResp = $this->post("/users/{$adminUser->id}/update", [
            'name' => 'Alice Renamed',
            'role_id' => $this->staffRole->id,
            'username' => 'alice_admin',
        ]);
        $updateResp->assertStatus(302);
        $this->assertEquals('Alice Renamed', $adminUser->refresh()->name);
    }
}
