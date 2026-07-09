<?php

namespace Tests\Feature;

use App\Models\Item;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_onboarding_registration_creates_tenant_and_admin_user()
    {
        $response = $this->post('/register', [
            'company_name' => 'Delta Machining',
            'slug' => 'delta',
            'name' => 'Agung Pratama',
            'email' => 'agung@delta.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertRedirect('/c/delta');
        $this->assertAuthenticated();

        // Assert Tenant created
        $tenant = Tenant::where('company_name', 'Delta Machining')->first();
        $this->assertNotNull($tenant);
        $this->assertEquals('delta', $tenant->slug);

        // Assert User created
        $user = User::where('email', 'agung@delta.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('Agung Pratama', $user->name);
        $this->assertEquals('OWNER', $user->role);
        $this->assertEquals($tenant->id, $user->tenant_id);
    }

    public function test_username_only_login_works()
    {
        $tenant = Tenant::create([
            'company_name' => 'Gamma Fab',
            'slug' => 'gamma-fab',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Eko Prasetyo',
            'username' => 'eko_gamma',
            'password' => Hash::make('secretpass'),
            'role' => 'ADMIN',
        ]);

        // Attempt login with correct username and password
        $response = $this->post('/login', [
            'username' => 'eko_gamma',
            'password' => 'secretpass',
        ]);

        $response->assertRedirect('/c/gamma-fab');
        $this->assertAuthenticatedAs($user);
    }

    public function test_user_management_crud_operations()
    {
        $tenant = Tenant::create([
            'company_name' => 'Beta Works',
            'slug' => 'beta-works',
        ]);

        $admin = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Admin User',
            'username' => 'admin_beta',
            'password' => Hash::make('password'),
            'role' => 'ADMIN',
        ]);

        $this->actingAs($admin);
        TenantManager::setTenantId($tenant->id);

        // 1. Create a Worker User (PIN-based)
        $createResponse = $this->post('/users', [
            'role' => 'WORKER',
            'name' => 'Bambang',
            'pin' => '000000',
        ]);

        $createResponse->assertRedirect();
        $worker = User::where('name', 'Bambang')->first();
        $this->assertNotNull($worker);
        $this->assertEquals('WORKER', $worker->role);
        $this->assertTrue(Hash::check('000000', $worker->pin));

        // 2. Update the Worker User to QC
        $updateResponse = $this->post("/users/{$worker->id}/update", [
            'role' => 'QC',
            'name' => 'Bambang QC',
            'pin' => '12345',
        ]);

        $updateResponse->assertRedirect();
        $worker->refresh();
        $this->assertEquals('QC', $worker->role);
        $this->assertEquals('Bambang QC', $worker->name);
        $this->assertTrue(Hash::check('12345', $worker->pin));

        // 3. Delete the Worker User
        $deleteResponse = $this->post("/users/{$worker->id}/delete");
        $deleteResponse->assertRedirect();
        $this->assertNull(User::find($worker->id));
    }

    public function test_purchase_order_broadcasting()
    {
        $tenant = Tenant::create([
            'company_name' => 'Alpha CNC',
            'slug' => 'alpha-cnc',
        ]);

        $admin = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Admin Alpha',
            'username' => 'admin_alpha',
            'password' => Hash::make('password'),
            'role' => 'ADMIN',
        ]);

        $this->actingAs($admin);
        TenantManager::setTenantId($tenant->id);

        $response = $this->post('/pos', [
            'po_number' => 'PO-ALPHA-01',
            'client_name' => 'PT Astra',
            'global_deadline_relative' => '1 week',
            'items' => [
                [
                    'item_name' => 'Gear Shaft',
                    'item_type' => 'MANUFACTURE',
                    'target_qty' => 5,
                    'required_stages' => ['Machining'],
                ],
                [
                    'item_name' => 'Cover Plate',
                    'item_type' => 'MANUFACTURE',
                    'target_qty' => 10,
                    'required_stages' => ['Fabrication'],
                ],
            ],
        ]);

        $response->assertRedirect();

        // Assert PO created
        $po = Po::where('po_number', 'PO-ALPHA-01')->first();
        $this->assertNotNull($po);
        $this->assertEquals('PT Astra', $po->client_name);

        // Assert Items created
        $items = Item::where('po_id', $po->id)->get();
        $this->assertCount(2, $items);

        $gearShaft = $items->where('item_name', 'Gear Shaft')->first();
        $this->assertNotNull($gearShaft);
        $this->assertEquals(5, $gearShaft->target_qty);
        $this->assertEquals(['Material', 'Design', 'Machining', 'QC', 'Delivery'], $gearShaft->required_stages);

        // Assert observers auto-created stages (Design, Material, Machining, QC, and Delivery)
        $this->assertCount(5, $gearShaft->itemProgresses);
        $this->assertContains('Machining', $gearShaft->itemProgresses->pluck('stage_name')->toArray());
    }

    public function test_administrative_users_cannot_log_in_via_pin()
    {
        $tenant = Tenant::create([
            'company_name' => 'Delta Machining',
            'slug' => 'delta',
        ]);

        $admin = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Admin Pin',
            'role' => 'ADMIN',
            'pin' => bcrypt('1234'),
        ]);

        // Attempt login via Guard B PIN endpoint
        $response = $this->post("/c/{$tenant->slug}/login", [
            'user_id' => $admin->id,
            'pin' => '1234',
        ]);

        $response->assertSessionHasErrors('pin');
        $this->assertGuest();
    }

    public function test_login_scramble_username_returns_error()
    {
        $response = $this->post('/login', [
            'username' => 'nonexistent_user',
            'password' => 'somepassword',
        ]);

        $response->assertSessionHasErrors('username');
        $this->assertGuest();
    }

    public function test_login_scramble_password_returns_error()
    {
        $tenant = Tenant::create([
            'company_name' => 'Gamma Fab',
            'slug' => 'gamma-fab',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Eko Prasetyo',
            'username' => 'eko_gamma',
            'password' => Hash::make('secretpass'),
            'role' => 'ADMIN',
        ]);

        $response = $this->post('/login', [
            'username' => 'eko_gamma',
            'password' => 'wrongpass',
        ]);

        $response->assertSessionHasErrors('username');
        $this->assertGuest();
    }
}
