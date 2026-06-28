<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Po;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\DeliveryOrder;
use App\Models\DoItem;
use App\Models\Invoice;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoreLogicTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant1;
    protected Tenant $tenant2;

    protected function setUp(): void
    {
        parent::setUp();

        // Create two tenants
        $this->tenant1 = Tenant::create([
            'company_name' => 'Teknik Mandiri',
            'slug' => 'teknik-mandiri',
            'subscription_status' => 'active',
        ]);

        $this->tenant2 = Tenant::create([
            'company_name' => 'Fabricator Pro',
            'slug' => 'fabricator-pro',
            'subscription_status' => 'active',
        ]);
    }

    public function test_tenant_scoping()
    {
        // Set active tenant to Tenant 1
        TenantManager::setTenantId($this->tenant1->id);

        $po1 = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        // Set active tenant to Tenant 2
        TenantManager::setTenantId($this->tenant2->id);

        $po2 = Po::create([
            'po_number' => 'PO-2001',
            'client_name' => 'Client B',
            'global_deadline' => now()->addDays(5),
            'status' => 'PENDING',
        ]);

        // Set active tenant to Tenant 1 and assert we only see PO 1
        TenantManager::setTenantId($this->tenant1->id);
        $this->assertEquals(1, Po::count());
        $this->assertEquals('PO-1001', Po::first()->po_number);

        // Set active tenant to Tenant 2 and assert we only see PO 2
        TenantManager::setTenantId($this->tenant2->id);
        $this->assertEquals(1, Po::count());
        $this->assertEquals('PO-2001', Po::first()->po_number);

        // Bypass scope and see all
        TenantManager::bypass();
        $this->assertEquals(2, Po::count());
        TenantManager::enableScope();
    }

    public function test_item_progress_auto_spawning_and_weighted_calculation_qty_greater_than_one()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        // Create item with target qty > 1
        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Shaft S45C',
            'target_qty' => 20,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC', 'FABRIKASI'],
            'status' => 'PENDING',
        ]);

        // Check if parallel entries in item_progress table were spawned
        $this->assertEquals(2, $item->itemProgresses()->count());
        $this->assertEquals(['CNC', 'FABRIKASI'], $item->itemProgresses()->pluck('stage_name')->toArray());

        // Update progress of CNC stage (5 out of 20 pieces)
        $cncStage = $item->itemProgresses()->where('stage_name', 'CNC')->first();
        $cncStage->update([
            'completed_qty' => 5,
            'status' => 'IN_PROGRESS',
        ]);

        // Recalculate should trigger via observer.
        // Formula (Qty > 1): Completed Qty Sum (5) / (Target (20) * Total Stages (2)) * 100 = 5 / 40 * 100 = 12.5%
        $item->refresh();
        $this->assertEquals(12.50, (float)$item->progress_percent);
        $this->assertEquals('IN_PROGRESS', $item->status);

        // Update progress of FABRIKASI stage (15 out of 20 pieces)
        $fabStage = $item->itemProgresses()->where('stage_name', 'FABRIKASI')->first();
        $fabStage->update([
            'completed_qty' => 15,
            'status' => 'IN_PROGRESS',
        ]);

        // Formula: Completed Qty Sum (5 + 15 = 20) / (20 * 2 = 40) * 100 = 50%
        $item->refresh();
        $this->assertEquals(50.00, (float)$item->progress_percent);

        // Finish all
        $cncStage->update(['completed_qty' => 20, 'status' => 'COMPLETED']);
        $fabStage->update(['completed_qty' => 20, 'status' => 'COMPLETED']);

        $item->refresh();
        $this->assertEquals(100.00, (float)$item->progress_percent);
        $this->assertEquals('COMPLETED', $item->status);
    }

    public function test_item_progress_calculation_qty_equal_to_one()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        // Create item with target qty == 1
        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Special Bracket',
            'target_qty' => 1,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['DESIGN', 'CNC', 'QC'],
            'status' => 'PENDING',
        ]);

        // Update progress of stages using percentages (e.g., DESIGN at 100%, CNC at 50%)
        $designStage = $item->itemProgresses()->where('stage_name', 'DESIGN')->first();
        $designStage->update([
            'progress_percent' => 100.00,
            'status' => 'COMPLETED',
        ]);

        // Formula: (100 + 0 + 0) / 3 = 33.33%
        $item->refresh();
        $this->assertEquals(33.33, round((float)$item->progress_percent, 2));

        $cncStage = $item->itemProgresses()->where('stage_name', 'CNC')->first();
        $cncStage->update([
            'progress_percent' => 50.00,
            'status' => 'IN_PROGRESS',
        ]);

        // Formula: (100 + 50 + 0) / 3 = 50.00%
        $item->refresh();
        $this->assertEquals(50.00, (float)$item->progress_percent);

        $qcStage = $item->itemProgresses()->where('stage_name', 'QC')->first();
        $qcStage->update([
            'progress_percent' => 100.00,
            'status' => 'COMPLETED',
        ]);
        $cncStage->update([
            'progress_percent' => 100.00,
            'status' => 'COMPLETED',
        ]);

        // Formula: (100 + 100 + 100) / 3 = 100%
        $item->refresh();
        $this->assertEquals(100.00, (float)$item->progress_percent);
        $this->assertEquals('COMPLETED', $item->status);
    }

    public function test_delivery_order_completes_po()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item1 = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Item 1',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC'],
            'status' => 'PENDING',
        ]);

        $item2 = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Item 2',
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC'],
            'status' => 'PENDING',
        ]);

        $do1 = DeliveryOrder::create([
            'po_id' => $po->id,
            'do_number' => 'DO-01',
            'delivery_date' => now(),
        ]);

        // Deliver part of Item 1 (5/10) and part of Item 2 (2/5)
        DoItem::create([
            'delivery_order_id' => $do1->id,
            'item_id' => $item1->id,
            'delivered_qty' => 5,
        ]);

        DoItem::create([
            'delivery_order_id' => $do1->id,
            'item_id' => $item2->id,
            'delivered_qty' => 2,
        ]);

        $po->refresh();
        $this->assertNotEquals('COMPLETED', $po->status);

        $do2 = DeliveryOrder::create([
            'po_id' => $po->id,
            'do_number' => 'DO-02',
            'delivery_date' => now(),
        ]);

        // Deliver rest of Item 1 (5/10) and rest of Item 2 (3/5)
        DoItem::create([
            'delivery_order_id' => $do2->id,
            'item_id' => $item1->id,
            'delivered_qty' => 5,
        ]);

        DoItem::create([
            'delivery_order_id' => $do2->id,
            'item_id' => $item2->id,
            'delivered_qty' => 3,
        ]);

        $po->refresh();
        $this->assertEquals('COMPLETED', $po->status);
    }

    public function test_qc_rework_spawns_rework_stage()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Shaft S45C',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC'],
            'status' => 'PENDING',
        ]);

        // Mock worker login
        $worker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Worker 1',
            'role' => 'WORKER',
            'pin' => bcrypt('1234'),
        ]);
        $this->actingAs($worker);

        $cncStage = $item->itemProgresses()->where('stage_name', 'CNC')->first();

        // QC logs reject_qty = 2
        $response = $this->post("/c/{$this->tenant1->slug}/progress/{$cncStage->id}/rework", [
            'reject_qty' => 2,
        ]);

        $response->assertRedirect();
        
        // Assert the sub-stage CNC - REWORK was spawned
        $this->assertDatabaseHas('item_progress', [
            'item_id' => $item->id,
            'stage_name' => 'CNC - REWORK',
            'completed_qty' => 0,
            'status' => 'PENDING',
        ]);

        // Assert YELLOW alert was logged
        $this->assertDatabaseHas('alerts', [
            'item_id' => $item->id,
            'severity' => 'YELLOW',
            'is_resolved' => false,
        ]);
    }

    public function test_lapor_kendala_spawns_red_alert_and_broadcasts()
    {
        \Illuminate\Support\Facades\Event::fake([
            \App\Events\KendalaReported::class,
            \App\Events\ProductionTerminated::class,
        ]);

        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Shaft S45C',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC'],
            'status' => 'PENDING',
        ]);

        $worker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Worker 1',
            'role' => 'WORKER',
            'pin' => bcrypt('1234'),
        ]);
        $this->actingAs($worker);

        $cncStage = $item->itemProgresses()->where('stage_name', 'CNC')->first();

        // Worker reports kendala: Machine Broken
        $response = $this->post("/c/{$this->tenant1->slug}/progress/{$cncStage->id}/kendala", [
            'kendala_type' => 'Machine Broken',
        ]);

        $response->assertRedirect();

        // Assert CNC stage is STUCK
        $this->assertEquals('STUCK', $cncStage->refresh()->status);

        // Assert RED alert was logged
        $this->assertDatabaseHas('alerts', [
            'item_id' => $item->id,
            'severity' => 'RED',
            'is_resolved' => false,
        ]);

        // Assert event was broadcasted
        \Illuminate\Support\Facades\Event::assertDispatched(\App\Events\KendalaReported::class);
    }

    public function test_evaluate_timelines_command_spawns_appropriate_alerts()
    {
        TenantManager::setTenantId($this->tenant1->id);

        // PO 1: Overdue
        $poOverdue = Po::create([
            'po_number' => 'PO-1',
            'client_name' => 'Client 1',
            'global_deadline' => now()->subDays(1), // Past deadline
            'status' => 'PENDING',
        ]);
        $itemOverdue = Item::create([
            'po_id' => $poOverdue->id,
            'item_name' => 'Overdue Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC'],
            'status' => 'PENDING',
        ]);

        // PO 2: Approaching risk (Days left = 2, Progress = 0% < 70%)
        $poRisk = Po::create([
            'po_number' => 'PO-2',
            'client_name' => 'Client 2',
            'global_deadline' => now()->addDays(2),
            'status' => 'PENDING',
        ]);
        $itemRisk = Item::create([
            'po_id' => $poRisk->id,
            'item_name' => 'Risk Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC'],
            'status' => 'PENDING',
        ]);

        // Run the command
        $this->artisan('pogrid:evaluate-timelines')->assertSuccessful();

        // Check alerts
        $this->assertDatabaseHas('alerts', [
            'item_id' => $itemOverdue->id,
            'severity' => 'RED',
            'is_resolved' => false,
        ]);

        $this->assertDatabaseHas('alerts', [
            'item_id' => $itemRisk->id,
            'severity' => 'YELLOW',
            'is_resolved' => false,
        ]);
    }

    public function test_sunk_cost_cancel_protection_and_midway_termination()
    {
        \Illuminate\Support\Facades\Event::fake([
            \App\Events\KendalaReported::class,
            \App\Events\ProductionTerminated::class,
        ]);
        \Illuminate\Support\Facades\Queue::fake();

        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item0Percent = Item::create([
            'po_id' => $po->id,
            'item_name' => '0 Percent Progress Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC'],
            'status' => 'PENDING',
        ]);

        $item50Percent = Item::create([
            'po_id' => $po->id,
            'item_name' => '50 Percent Progress Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC'],
            'status' => 'PENDING',
        ]);

        // Make progress of 50% item > 0%
        $cncStage = $item50Percent->itemProgresses()->first();
        $cncStage->update(['completed_qty' => 5]);
        $item50Percent->refresh();
        $this->assertEquals(50.00, (float)$item50Percent->progress_percent);

        // Login as Owner
        $owner = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Owner',
            'role' => 'OWNER',
            'email' => 'owner@example.com',
            'password' => bcrypt('password'),
        ]);
        $this->actingAs($owner);

        // Cancel 0% progress item -> Allowed
        $response = $this->post("/items/{$item0Percent->id}/cancel");
        $response->assertRedirect();
        $this->assertEquals('CANCELLED', $item0Percent->refresh()->status);

        // Cancel 50% progress item -> Blocked with 403
        $response2 = $this->post("/items/{$item50Percent->id}/cancel");
        $response2->assertStatus(403);
        $this->assertNotEquals('CANCELLED', $item50Percent->refresh()->status);

        // Terminate Midway 50% progress item -> Dispatches job & broadcasts freeze
        $response3 = $this->post("/items/{$item50Percent->id}/terminate");
        $response3->assertRedirect();
        $this->assertEquals('TERMINATED', $item50Percent->refresh()->status);

        \Illuminate\Support\Facades\Event::assertDispatched(\App\Events\ProductionTerminated::class);
        \Illuminate\Support\Facades\Queue::assertPushed(\App\Jobs\GenerateSunkCostInvoiceJob::class);
    }

    public function test_delivery_order_creation_via_route()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item1 = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Item 1',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC'],
            'status' => 'PENDING',
        ]);

        $owner = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Owner',
            'role' => 'OWNER',
            'email' => 'owner@example.com',
            'password' => bcrypt('password'),
        ]);
        $this->actingAs($owner);

        // Success DO creation
        $response = $this->post('/delivery-orders', [
            'po_id' => $po->id,
            'do_number' => 'DO-100',
            'delivery_date' => now()->toDateString(),
            'items' => [
                ['item_id' => $item1->id, 'delivered_qty' => 4]
            ]
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('delivery_orders', [
            'po_id' => $po->id,
            'do_number' => 'DO-100'
        ]);

        $this->assertDatabaseHas('do_items', [
            'item_id' => $item1->id,
            'delivered_qty' => 4
        ]);

        // Failed DO creation: exceeding quantity
        $response2 = $this->post('/delivery-orders', [
            'po_id' => $po->id,
            'do_number' => 'DO-101',
            'delivery_date' => now()->toDateString(),
            'items' => [
                ['item_id' => $item1->id, 'delivered_qty' => 7] // 4 + 7 = 11 > 10
            ]
        ]);
        $response2->assertSessionHasErrors();
    }

    public function test_invoice_creation_blocked_without_do()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $owner = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Owner',
            'role' => 'OWNER',
            'email' => 'owner@example.com',
            'password' => bcrypt('password'),
        ]);
        $this->actingAs($owner);

        // Blocked since no DO exists
        $response = $this->post('/invoices', [
            'delivery_order_id' => 999, // Dummy
            'invoice_number' => 'INV-001',
            'due_date' => now()->addDays(7)->toDateString()
        ]);

        $response->assertStatus(403);
    }

    public function test_invoice_creation_succeeds_with_do()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item1 = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Item 1',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC'],
            'status' => 'PENDING',
        ]);

        $do = DeliveryOrder::create([
            'po_id' => $po->id,
            'do_number' => 'DO-200',
            'delivery_date' => now(),
        ]);

        DoItem::create([
            'delivery_order_id' => $do->id,
            'item_id' => $item1->id,
            'delivered_qty' => 5,
        ]);

        $owner = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Owner',
            'role' => 'OWNER',
            'email' => 'owner@example.com',
            'password' => bcrypt('password'),
        ]);
        $this->actingAs($owner);

        // Success since DO exists
        $response = $this->post('/invoices', [
            'delivery_order_id' => $do->id,
            'invoice_number' => 'INV-001',
            'due_date' => now()->addDays(7)->toDateString()
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('invoices', [
            'delivery_order_id' => $do->id,
            'invoice_number' => 'INV-001',
            'total_amount' => 750000.00 // 5 * 150,000
        ]);
    }

    public function test_invoice_pdf_download()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item1 = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Item 1',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC'],
            'status' => 'PENDING',
        ]);

        $do = DeliveryOrder::create([
            'po_id' => $po->id,
            'do_number' => 'DO-200',
            'delivery_date' => now(),
        ]);

        DoItem::create([
            'delivery_order_id' => $do->id,
            'item_id' => $item1->id,
            'delivered_qty' => 5,
        ]);

        $invoice = Invoice::create([
            'tenant_id' => $this->tenant1->id,
            'delivery_order_id' => $do->id,
            'invoice_number' => 'INV-001',
            'total_amount' => 750000.00,
            'status' => 'UNPAID',
            'due_date' => now()->addDays(7),
            'invoice_type' => 'STANDARD',
        ]);

        $owner = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Owner',
            'role' => 'OWNER',
            'email' => 'owner@example.com',
            'password' => bcrypt('password'),
        ]);
        $this->actingAs($owner);

        $response = $this->get("/invoices/{$invoice->id}/pdf");
        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');
    }
}
