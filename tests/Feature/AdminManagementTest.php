<?php

namespace Tests\Feature;

use App\Models\Item;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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
        $this->assertEquals('STAFF', $user->role_name);
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
            'role_id' => 8,
            'post_id' => 12,
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
            'role_id' => 8,
            'post_id' => 12,
        ]);

        $this->actingAs($admin);
        TenantManager::setTenantId($tenant->id);

        // 1. Create a Worker User (PIN-based)
        $createResponse = $this->post('/users', [
            'role_id' => 5,
            'post_id' => 7,
            'name' => 'Bambang',
            'pin' => '000000',
        ]);

        $createResponse->assertRedirect();
        $worker = User::where('name', 'Bambang')->first();
        $this->assertNotNull($worker);
        $this->assertEquals('PRODUCTION', $worker->role_name);
        $this->assertTrue(Hash::check('000000', $worker->pin));

        // 2. Update the Worker User to QC
        $updateResponse = $this->post("/users/{$worker->id}/update", [
            'role_id' => 6,
            'post_id' => 8,
            'name' => 'Bambang QC',
            'pin' => '12345',
        ]);

        $updateResponse->assertRedirect();
        $worker->refresh();
        $this->assertEquals('QC', $worker->role_name);
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
            'role_id' => 8,
            'post_id' => 12,
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
                    'required_stages' => ['Material', 'Design', 'Machining', 'QC', 'Delivery'],
                ],
                [
                    'item_name' => 'Cover Plate',
                    'item_type' => 'MANUFACTURE',
                    'target_qty' => 10,
                    'required_stages' => ['Material', 'Design', 'Fabrication', 'QC', 'Delivery'],
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
            'role_id' => 8,
            'post_id' => 12,
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
            'role_id' => 8,
            'post_id' => 12,
        ]);

        $response = $this->post('/login', [
            'username' => 'eko_gamma',
            'password' => 'wrongpass',
        ]);

        $response->assertSessionHasErrors('username');
        $this->assertGuest();
    }

    public function test_new_roles_create_correctly()
    {
        $tenant = Tenant::create([
            'company_name' => 'New Roles Works',
            'slug' => 'new-roles',
        ]);

        $admin = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Admin New Roles',
            'username' => 'admin_newroles',
            'password' => Hash::make('password'),
            'role_id' => 8,
            'post_id' => 12,
        ]);

        $this->actingAs($admin);
        TenantManager::setTenantId($tenant->id);

        $newRoles = ['ASSEMBLY', 'SURFACE', 'PPIC', 'MAINTENANCE'];
        $newPosts = ['ASSEMBLY', 'MECHANICAL_FITTER', 'HEAT_TREATMENT', 'PAINTING', 'PPIC', 'MAINTENANCE'];

        foreach ($newRoles as $roleName) {
            $role = DB::table('roles')->where('name', $roleName)->first();
            $this->assertNotNull($role, "Role {$roleName} should exist");
        }

        foreach ($newPosts as $postName) {
            $post = DB::table('posts')->where('name', $postName)->first();
            $this->assertNotNull($post, "Post {$postName} should exist");
        }

        // Create a user with ASSEMBLY role
        $createResponse = $this->post('/users', [
            'role_id' => DB::table('roles')->where('name', 'ASSEMBLY')->first()->id,
            'post_id' => DB::table('posts')->where('name', 'ASSEMBLY')->first()->id,
            'name' => 'Tukang Rakit',
            'pin' => '123456',
        ]);
        $createResponse->assertRedirect();

        $worker = User::where('name', 'Tukang Rakit')->first();
        $this->assertNotNull($worker);
        $this->assertEquals('ASSEMBLY', $worker->role_name);

        // Create a user with SURFACE role
        $createResponse2 = $this->post('/users', [
            'role_id' => DB::table('roles')->where('name', 'SURFACE')->first()->id,
            'post_id' => DB::table('posts')->where('name', 'HEAT_TREATMENT')->first()->id,
            'name' => 'Tukang Cat',
            'pin' => '654321',
        ]);
        $createResponse2->assertRedirect();

        $worker2 = User::where('name', 'Tukang Cat')->first();
        $this->assertNotNull($worker2);
        $this->assertEquals('SURFACE', $worker2->role_name);

        // Create a user with PPIC role
        $createResponse3 = $this->post('/users', [
            'role_id' => DB::table('roles')->where('name', 'PPIC')->first()->id,
            'post_id' => DB::table('posts')->where('name', 'PPIC')->first()->id,
            'name' => 'PPIC User',
            'pin' => '111111',
        ]);
        $createResponse3->assertRedirect();

        $worker3 = User::where('name', 'PPIC User')->first();
        $this->assertNotNull($worker3);
        $this->assertEquals('PPIC', $worker3->role_name);

        // Create a user with MAINTENANCE role
        $createResponse4 = $this->post('/users', [
            'role_id' => DB::table('roles')->where('name', 'MAINTENANCE')->first()->id,
            'post_id' => DB::table('posts')->where('name', 'MAINTENANCE')->first()->id,
            'name' => 'Maintenance User',
            'pin' => '222222',
        ]);
        $createResponse4->assertRedirect();

        $worker4 = User::where('name', 'Maintenance User')->first();
        $this->assertNotNull($worker4);
        $this->assertEquals('MAINTENANCE', $worker4->role_name);
    }

    public function test_archive_query_returns_correct_items_per_role()
    {
        $tenant = Tenant::create([
            'company_name' => 'Archive Test',
            'slug' => 'archive-test',
        ]);

        $admin = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Admin Archive',
            'username' => 'admin_archive',
            'password' => Hash::make('password'),
            'role_id' => 8,
            'post_id' => 12,
        ]);

        $this->actingAs($admin);
        TenantManager::setTenantId($tenant->id);

        // Create PO with items for each role's archive query
        $po = Po::create([
            'po_number' => 'PO-ARCHIVE',
            'client_name' => 'Archive Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        // Item with Assembly stage
        $itemAssembly = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Assembly Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Assembly'],
            'status' => 'PENDING',
        ]);

        // Item with Surface Treatment stage
        $itemSurface = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Surface Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Surface Treatment'],
            'status' => 'PENDING',
        ]);

        // Complete Assembly stage for assembly item
        $itemAssembly->itemProgresses()->where('stage_name', 'Assembly')->update(['completed_qty' => 10, 'status' => 'COMPLETED']);

        // Complete Surface Treatment stage for surface item
        $itemSurface->itemProgresses()->where('stage_name', 'Surface Treatment')->update(['completed_qty' => 10, 'status' => 'COMPLETED']);

        // Ensure items are COMPLETED so archive query can match them
        $itemAssembly->refresh();
        $itemSurface->refresh();

        // 1. ASSEMBLY role sees items with COMPLETED Assembly stage
        $assemblyRole = DB::table('roles')->where('name', 'ASSEMBLY')->first();
        $assemblyPost = DB::table('posts')->where('name', 'ASSEMBLY')->first();
        $assemblyWorker = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Assembly Worker Archive',
            'role_id' => $assemblyRole->id,
            'post_id' => $assemblyPost->id,
            'pin' => bcrypt('1111'),
        ]);
        $this->actingAs($assemblyWorker);
        $response = $this->get("/c/{$tenant->slug}/archive");
        $response->assertStatus(200);
        $response->assertInertia(function ($page) use ($itemAssembly, $itemSurface) {
            $items = $page->toArray()['props']['items'];
            $itemIds = collect($items)->pluck('id')->toArray();
            $this->assertContains($itemAssembly->id, $itemIds);
            $this->assertNotContains($itemSurface->id, $itemIds);
        });

        // 2. SURFACE role sees items with COMPLETED Surface Treatment stage
        $surfaceRole = DB::table('roles')->where('name', 'SURFACE')->first();
        $surfacePost = DB::table('posts')->where('name', 'HEAT_TREATMENT')->first();
        $surfaceWorker = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Surface Worker Archive',
            'role_id' => $surfaceRole->id,
            'post_id' => $surfacePost->id,
            'pin' => bcrypt('2222'),
        ]);
        $this->actingAs($surfaceWorker);
        $response = $this->get("/c/{$tenant->slug}/archive");
        $response->assertStatus(200);
        $response->assertInertia(function ($page) use ($itemAssembly, $itemSurface) {
            $items = $page->toArray()['props']['items'];
            $itemIds = collect($items)->pluck('id')->toArray();
            $this->assertNotContains($itemAssembly->id, $itemIds);
            $this->assertContains($itemSurface->id, $itemIds);
        });

        // 3. PPIC role sees no archived items (default → 1=0)
        $ppicRole = DB::table('roles')->where('name', 'PPIC')->first();
        $ppicPost = DB::table('posts')->where('name', 'PPIC')->first();
        $ppicWorker = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'PPIC Worker Archive',
            'role_id' => $ppicRole->id,
            'post_id' => $ppicPost->id,
            'pin' => bcrypt('3333'),
        ]);
        $this->actingAs($ppicWorker);
        $response = $this->get("/c/{$tenant->slug}/archive");
        $response->assertStatus(200);
        $response->assertInertia(function ($page) {
            $items = $page->toArray()['props']['items'];
            $this->assertCount(0, $items);
        });

        // 4. MAINTENANCE role sees no archived items (default → 1=0)
        $maintenanceRole = DB::table('roles')->where('name', 'MAINTENANCE')->first();
        $maintenancePost = DB::table('posts')->where('name', 'MAINTENANCE')->first();
        $maintenanceWorker = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Maintenance Worker Archive',
            'role_id' => $maintenanceRole->id,
            'post_id' => $maintenancePost->id,
            'pin' => bcrypt('4444'),
        ]);
        $this->actingAs($maintenanceWorker);
        $response = $this->get("/c/{$tenant->slug}/archive");
        $response->assertStatus(200);
        $response->assertInertia(function ($page) {
            $items = $page->toArray()['props']['items'];
            $this->assertCount(0, $items);
        });
    }
}
