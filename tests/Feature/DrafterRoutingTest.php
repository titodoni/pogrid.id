<?php

namespace Tests\Feature;

use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Post;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\DrafterRoutingService;
use App\Services\PartCatalogService;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DrafterRoutingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $admin;

    protected User $drafter;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'company_name' => 'Teknik Mandiri',
            'slug' => 'teknik-mandiri',
        ]);

        TenantManager::setTenantId($this->tenant->id);

        $adminRole = Role::where('name', 'STAFF')->first();
        $adminPost = Post::where('name', 'Admin')->first();
        $this->admin = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Budi Santoso',
            'username' => 'budi',
            'email' => 'budi@example.com',
            'password' => bcrypt('secret'),
            'role_id' => $adminRole->id,
            'post_id' => $adminPost->id,
            'email_verified_at' => now(),
        ]);

        $drafterRole = Role::where('name', 'DRAFTER')->first();
        $drafterPost = Post::where('name', 'Design')->first();
        $this->drafter = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Arief Prasetyo',
            'pin' => '0000',
            'role_id' => $drafterRole->id,
            'post_id' => $drafterPost->id,
            'email_verified_at' => now(),
        ]);
    }

    public function test_part_catalog_service_retrieves_historical_items_by_client(): void
    {
        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-GDY-001',
            'client_name' => 'PT Goodyear Indonesia',
            'global_deadline' => now()->addDays(7),
            'status' => 'PENDING',
        ]);

        Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Shaft Arm',
            'item_type' => 'MANUFACTURE',
            'target_qty' => 23,
            'required_stages' => ['Design', 'Material', 'Machining', 'Bubut Manual', 'Assembly', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        $service = new PartCatalogService;
        $items = $service->getRecentItemsForClient('PT Goodyear Indonesia');

        $this->assertCount(1, $items);
        $this->assertEquals('Shaft Arm', $items[0]['item_name']);
        $this->assertEquals(['Design', 'Material', 'Machining', 'Bubut Manual', 'Assembly', 'QC', 'Delivery'], $items[0]['required_stages']);

        $search = $service->searchClientItems('PT Goodyear Indonesia', 'Shaft');
        $this->assertCount(1, $search);
        $this->assertEquals('Shaft Arm', $search[0]['item_name']);
    }

    public function test_drafter_routing_service_synchronizes_stages_and_approves_drawing(): void
    {
        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-GDY-002',
            'client_name' => 'PT Goodyear Indonesia',
            'global_deadline' => now()->addDays(7),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Gate Rack',
            'item_type' => 'MANUFACTURE',
            'target_qty' => 3,
            'required_stages' => ['Design', 'Material', 'Machining', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        // Item starts with 5 default stages from observer
        $this->assertEquals(5, $item->itemProgresses()->count());

        $service = new DrafterRoutingService;
        // Drafter adjusts routing to Welding + Painting + Assembly
        $updatedStages = ['Design', 'Material', 'Fabrication', 'Surface Treatment', 'Assembly', 'QC', 'Delivery'];

        $updatedItem = $service->updateStatusAndRouting($item, 'APPROVED', $updatedStages, $this->drafter);

        $this->assertEquals('APPROVED', $updatedItem->drafter_status);
        $this->assertEquals($updatedStages, $updatedItem->required_stages);

        // Verify Design stage is marked completed
        $designProgress = ItemProgress::where('item_id', $item->id)->where('stage_name', 'Design')->first();
        $this->assertNotNull($designProgress);
        $this->assertEquals('COMPLETED', $designProgress->status);
        $this->assertEquals(100.00, (float) $designProgress->progress_percent);

        // Verify new stages were spawned
        $this->assertTrue(ItemProgress::where('item_id', $item->id)->where('stage_name', 'Fabrication')->exists());
        $this->assertTrue(ItemProgress::where('item_id', $item->id)->where('stage_name', 'Surface Treatment')->exists());
        $this->assertTrue(ItemProgress::where('item_id', $item->id)->where('stage_name', 'Assembly')->exists());
    }

    public function test_admin_can_create_po_with_optional_stages(): void
    {
        $this->actingAs($this->admin);

        $response = $this->post('/pos', [
            'po_number' => 'PO-TEST-001',
            'client_name' => 'PT Astra Otoparts',
            'global_deadline' => now()->addDays(5)->toDateString(),
            'items' => [
                [
                    'item_name' => 'Bracket Fastener',
                    'item_type' => 'MANUFACTURE',
                    'target_qty' => 10,
                    // No required_stages provided - should default safely
                ],
            ],
        ]);

        $response->assertRedirect('/c/teknik-mandiri');

        $item = Item::where('item_name', 'Bracket Fastener')->first();
        $this->assertNotNull($item);
        $this->assertEquals(['Design', 'Material', 'QC', 'Delivery'], $item->required_stages);
        $this->assertCount(4, $item->itemProgresses);
    }

    public function test_ppic_can_update_item_routing(): void
    {
        $ppicRole = Role::where('name', 'STAFF')->first();
        $ppicPost = Post::where('name', 'PPIC')->first();
        $ppicUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role_id' => $ppicRole->id,
            'post_id' => $ppicPost->id,
        ]);

        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-PPIC-01',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(5)->toDateString(),
            'status' => 'PENDING',
        ]);
        $item = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Part PPIC',
            'item_type' => 'MANUFACTURE',
            'target_qty' => 5,
            'required_stages' => ['Design', 'Material', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        $this->actingAs($ppicUser);

        $response = $this->post("/c/{$this->tenant->slug}/ppic/items/{$item->id}/routing", [
            'required_stages' => ['Design', 'Material', 'Machining', 'Bubut Manual', 'Assembly', 'QC', 'Delivery'],
        ]);

        $response->assertSessionHas('flash.success', 'routing_updated_successfully');

        $item->refresh();
        $this->assertContains('Machining', $item->required_stages);
        $this->assertContains('Bubut Manual', $item->required_stages);
        $this->assertContains('Assembly', $item->required_stages);
        $this->assertTrue(ItemProgress::where('item_id', $item->id)->where('stage_name', 'Bubut Manual')->exists());
    }

    public function test_admin_can_update_item_routing(): void
    {
        $this->actingAs($this->admin);

        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-ADM-01',
            'client_name' => 'Client B',
            'global_deadline' => now()->addDays(5)->toDateString(),
            'status' => 'PENDING',
        ]);
        $item = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Part Admin',
            'item_type' => 'MANUFACTURE',
            'target_qty' => 8,
            'required_stages' => ['Design', 'Material', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        $response = $this->post("/items/{$item->id}/routing", [
            'required_stages' => ['Design', 'Material', 'Fabrication', 'QC', 'Delivery'],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Production routing updated successfully.');

        $item->refresh();
        $this->assertContains('Fabrication', $item->required_stages);
        $this->assertTrue(ItemProgress::where('item_id', $item->id)->where('stage_name', 'Fabrication')->exists());
    }
}
