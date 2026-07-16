<?php

namespace Tests\Feature;

use App\Events\KendalaReported;
use App\Events\ProductionTerminated;
use App\Jobs\GenerateSunkCostInvoiceJob;
use App\Models\Alert;
use App\Models\DeliveryOrder;
use App\Models\DoItem;
use App\Models\Invoice;
use App\Models\Item;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
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
            'required_stages' => ['Material', 'Design', 'Machining', 'Fabrication', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        // Check if parallel entries in item_progress table were spawned (expecting Design, Material, QC and Delivery to be auto-appended)
        $this->assertEquals(6, $item->itemProgresses()->count());
        $this->assertEquals(['Material', 'Design', 'Machining', 'Fabrication', 'QC', 'Delivery'], $item->itemProgresses()->pluck('stage_name')->toArray());

        // Complete Design & Material stages
        $designStage = $item->itemProgresses()->where('stage_name', 'Design')->first();
        $designStage->update(['completed_qty' => 20, 'status' => 'COMPLETED']);
        $materialStage = $item->itemProgresses()->where('stage_name', 'Material')->first();
        $materialStage->update(['completed_qty' => 20, 'status' => 'COMPLETED']);

        // Update progress of Machining stage (5 out of 20 pieces)
        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();
        $machiningStage->update([
            'completed_qty' => 5,
            'status' => 'IN_PROGRESS',
        ]);

        // Recalculate should trigger via observer.
        // Formula (Qty > 1): Completed Qty Sum (20 + 20 + 5 = 45) / (Target (20) * Total Stages (6)) * 100 = 45 / 120 * 100 = 37.5%
        $item->refresh();
        $this->assertEquals(37.5, (float) $item->progress_percent);
        $this->assertEquals('IN_PROGRESS', $item->status);

        // Update progress of Fabrication stage (15 out of 20 pieces)
        $fabStage = $item->itemProgresses()->where('stage_name', 'Fabrication')->first();
        $fabStage->update([
            'completed_qty' => 15,
            'status' => 'IN_PROGRESS',
        ]);

        // Formula: Completed Qty Sum (20 + 20 + 5 + 15 = 60) / (20 * 6 = 120) * 100 = 50%
        $item->refresh();
        $this->assertEquals(50.00, (float) $item->progress_percent);

        // Finish all
        $machiningStage->update(['completed_qty' => 20, 'status' => 'COMPLETED']);
        $fabStage->update(['completed_qty' => 20, 'status' => 'COMPLETED']);
        $qcStage = $item->itemProgresses()->where('stage_name', 'QC')->first();
        $deliveryStage = $item->itemProgresses()->where('stage_name', 'Delivery')->first();
        $qcStage->update(['completed_qty' => 20, 'status' => 'COMPLETED']);
        $deliveryStage->update(['completed_qty' => 20, 'status' => 'COMPLETED']);

        $item->refresh();
        $this->assertEquals(100.00, (float) $item->progress_percent);
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
            'required_stages' => ['Material', 'DESIGN', 'Machining', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        // Update progress of stages using percentages (e.g., DESIGN at 100%, Machining at 50%)
        $designStage = $item->itemProgresses()->where('stage_name', 'DESIGN')->first();
        // Reset auto-created stages to 0 to isolate test values
        $item->itemProgresses()->where('stage_name', 'Material')->update(['progress_percent' => 0.00, 'status' => 'PENDING', 'completed_qty' => 0]);
        $designStage->update([
            'progress_percent' => 100.00,
            'status' => 'COMPLETED',
        ]);

        // Formula: (100 + 0 + 0 + 0 + 0) / 5 = 20.00%
        $item->refresh();
        $this->assertEquals(20.00, round((float) $item->progress_percent, 2));

        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();
        $machiningStage->update([
            'progress_percent' => 50.00,
            'status' => 'IN_PROGRESS',
        ]);

        // Formula: (100 + 50 + 0 + 0 + 0) / 5 = 30.00%
        $item->refresh();
        $this->assertEquals(30.00, (float) $item->progress_percent);

        $qcStage = $item->itemProgresses()->where('stage_name', 'QC')->first();
        $qcStage->update([
            'progress_percent' => 100.00,
            'status' => 'COMPLETED',
        ]);
        $machiningStage->update([
            'progress_percent' => 100.00,
            'status' => 'COMPLETED',
        ]);

        $materialStage = $item->itemProgresses()->where('stage_name', 'Material')->first();
        $materialStage->update([
            'progress_percent' => 100.00,
            'status' => 'COMPLETED',
        ]);

        $deliveryStage = $item->itemProgresses()->where('stage_name', 'Delivery')->first();
        $deliveryStage->update([
            'progress_percent' => 100.00,
            'status' => 'COMPLETED',
        ]);

        // Formula: (100 + 100 + 100 + 100 + 100) / 5 = 100%
        $item->refresh();
        $this->assertEquals(100.00, (float) $item->progress_percent);
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
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $item2 = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Item 2',
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
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
        $this->assertEquals('DELIVERED', $po->status);
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
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        // Mock QC login
        $worker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'QC Worker',
            'role_id' => 6,
            'post_id' => 8,
            'pin' => bcrypt('1234'),
        ]);
        $this->actingAs($worker);

        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();

        // QC logs reject_qty = 2
        $response = $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/rework", [
            'reject_qty' => 2,
        ]);

        $response->assertRedirect();

        // Assert the sub-stage Machining - REWORK was spawned
        $this->assertDatabaseHas('item_progress', [
            'item_id' => $item->id,
            'stage_name' => 'Machining - REWORK',
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
        Event::fake([
            KendalaReported::class,
            ProductionTerminated::class,
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
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $item->itemProgresses()->whereIn('stage_name', ['Design', 'Material'])->update(['status' => 'COMPLETED', 'completed_qty' => 10]);

        $worker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Machining Worker',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('1234'),
        ]);
        $this->actingAs($worker);

        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();

        // Worker reports kendala: Machine Broken
        $response = $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/kendala", [
            'kendala_type' => 'Machine Broken',
        ]);

        $response->assertRedirect();

        // Assert Machining stage is STUCK
        $this->assertEquals('STUCK', $machiningStage->refresh()->status);

        // Assert RED alert was logged
        $this->assertDatabaseHas('alerts', [
            'item_id' => $item->id,
            'severity' => 'RED',
            'is_resolved' => false,
        ]);

        // Assert event was broadcasted
        Event::assertDispatched(KendalaReported::class);
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
            'required_stages' => ['Machining'],
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
            'required_stages' => ['Machining'],
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
        Event::fake([
            KendalaReported::class,
            ProductionTerminated::class,
        ]);
        Queue::fake();

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
            'required_stages' => ['Material', 'Design', 'Machining', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        $item50Percent = Item::create([
            'po_id' => $po->id,
            'item_name' => '50 Percent Progress Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Material', 'Design', 'Machining', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        // Make progress of 50% item > 0% (Machining 5 out of 10)
        // With Design, Material, QC and Delivery appended, total stages is 5. Progress is 5 / (10 * 5) = 10%
        $machiningStage = $item50Percent->itemProgresses()->where('stage_name', 'Machining')->first();
        $machiningStage->update(['completed_qty' => 5]);
        $item50Percent->refresh();
        $this->assertEquals(10.00, round((float) $item50Percent->progress_percent, 2));

        // Login as Owner
        $owner = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Owner',
            'role_id' => 8,
            'post_id' => 12,
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

        Event::assertDispatched(ProductionTerminated::class);
        Queue::assertPushed(GenerateSunkCostInvoiceJob::class);
    }

    public function test_qc_rework_progress_calculation_reaches_100_percent()
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
            'required_stages' => ['Design', 'Material', 'Machining', 'Fabrication', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();
        $fabStage = $item->itemProgresses()->where('stage_name', 'Fabrication')->first();
        $qcStage = $item->itemProgresses()->where('stage_name', 'QC')->first();
        $deliveryStage = $item->itemProgresses()->where('stage_name', 'Delivery')->first();

        // All stages fully completed
        $item->itemProgresses()->whereIn('stage_name', ['Design', 'Material'])->update(['completed_qty' => 10, 'status' => 'COMPLETED']);
        $machiningStage->update(['completed_qty' => 10, 'status' => 'COMPLETED']);
        $fabStage->update(['completed_qty' => 10, 'status' => 'COMPLETED']);
        $qcStage->update(['completed_qty' => 10, 'status' => 'COMPLETED']);
        $deliveryStage->update(['completed_qty' => 10, 'status' => 'COMPLETED']);

        $item->refresh();
        $this->assertEquals(100.00, (float) $item->progress_percent);
        $this->assertEquals('COMPLETED', $item->status);

        // QC logs reject_qty = 2 on Machining
        $worker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'QC Worker',
            'role_id' => 6,
            'post_id' => 8,
            'pin' => bcrypt('1234'),
        ]);
        $this->actingAs($worker);

        $response = $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/rework", [
            'reject_qty' => 2,
        ]);
        $response->assertRedirect();

        // Original Machining completed qty should be reduced to 8
        $machiningStage->refresh();
        $this->assertEquals(8, $machiningStage->completed_qty);

        // Item progress should drop to 96.67% (10 Design + 10 Material + 8 Machining + 10 Fabrication + 10 QC + 10 Delivery) / 60 * 100 = 96.67%
        $item->refresh();
        $this->assertEquals(96.67, round((float) $item->progress_percent, 2));
        $this->assertEquals('IN_PROGRESS', $item->status);

        // Machining worker completes 2 reworked items
        $machiningWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Machining Worker Rework',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('1234'),
        ]);
        $this->actingAs($machiningWorker);

        $reworkStage = $item->itemProgresses()->where('stage_name', 'Machining - REWORK')->first();
        $this->assertNotNull($reworkStage);

        $response2 = $this->post("/c/{$this->tenant1->slug}/progress/{$reworkStage->id}/update", [
            'completed_qty' => 2,
        ]);
        $response2->assertRedirect();

        // Item progress should be 100% (8 Machining + 10 Fabrication + 10 QC + 10 Delivery + 2 Rework) / 40 * 100 = 100%
        $item->refresh();
        $this->assertEquals(100.00, (float) $item->progress_percent);
        $this->assertEquals('COMPLETED', $item->status);
    }

    public function test_evaluate_timelines_escalates_red_alerts_unresolved_over_24h()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-ESC-1',
            'client_name' => 'Client Esc',
            'global_deadline' => now()->subDays(2),
            'status' => 'PENDING',
        ]);
        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Stuck Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        // Create RED alert that is >24h old (created 36 hours ago)
        $staleAlert = Alert::create([
            'tenant_id' => $this->tenant1->id,
            'item_id' => $item->id,
            'severity' => 'RED',
            'message' => 'Overdue: Stuck Item under PO-ESC-1 is not completed past deadline.',
            'is_resolved' => false,
        ]);
        DB::table('alerts')->where('id', $staleAlert->id)->update([
            'created_at' => now()->subHours(36),
            'updated_at' => now()->subHours(36),
        ]);
        $staleAlert->refresh();

        // Create fresh RED alert (<24h old)
        $freshAlert = Alert::create([
            'tenant_id' => $this->tenant1->id,
            'item_id' => $item->id,
            'severity' => 'RED',
            'message' => 'Overdue: Another stuck item under PO-ESC-1 is not completed past deadline.',
            'is_resolved' => false,
        ]);
        DB::table('alerts')->where('id', $freshAlert->id)->update([
            'created_at' => now()->subHours(2),
            'updated_at' => now()->subHours(2),
        ]);
        $freshAlert->refresh();

        // Run command
        $this->artisan('pogrid:evaluate-timelines')->assertSuccessful();

        // Reset TenantManager context to tenant1 after command (command leaves state as last tenant)
        TenantManager::setTenantId($this->tenant1->id);

        // Stale alert should be escalated
        $staleAlert->refresh();
        $this->assertNotNull($staleAlert->escalated_at, 'RED alert >24h unresolved should be escalated');

        // Fresh alert should NOT be escalated
        $freshAlert->refresh();
        $this->assertNull($freshAlert->escalated_at, 'RED alert <24h old should not be escalated');
    }

    public function test_evaluate_timelines_command_does_not_leak_cross_tenant_alerts()
    {
        // Setup Tenant 1
        TenantManager::setTenantId($this->tenant1->id);
        $po1 = Po::create([
            'po_number' => 'PO-T1',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10), // Healthy
            'status' => 'PENDING',
        ]);
        $item1 = Item::create([
            'po_id' => $po1->id,
            'item_name' => 'Tenant 1 Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        // Setup Tenant 2
        TenantManager::setTenantId($this->tenant2->id);
        $po2 = Po::create([
            'po_number' => 'PO-T2',
            'client_name' => 'Client B',
            'global_deadline' => now()->subDays(1), // Overdue!
            'status' => 'PENDING',
        ]);
        $item2 = Item::create([
            'po_id' => $po2->id,
            'item_name' => 'Tenant 2 Overdue Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        // Run command
        $this->artisan('pogrid:evaluate-timelines')->assertSuccessful();

        // Check alerts
        // Tenant 1 should have NO alerts, because their item is healthy
        TenantManager::setTenantId($this->tenant1->id);
        $this->assertEquals(0, Alert::where('tenant_id', $this->tenant1->id)->count());

        // Tenant 2 should have 1 RED alert, because their item is overdue
        TenantManager::setTenantId($this->tenant2->id);
        $this->assertEquals(1, Alert::where('tenant_id', $this->tenant2->id)->count());
        $this->assertDatabaseHas('alerts', [
            'tenant_id' => $this->tenant2->id,
            'item_id' => $item2->id,
            'severity' => 'RED',
        ]);
    }

    public function test_item_has_finance_status_attributes()
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
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
            'invoice_status' => 'PENDING',
            'payment_status' => 'UNPAID',
        ]);

        $this->assertEquals('PENDING', $item->invoice_status);
        $this->assertEquals('UNPAID', $item->payment_status);

        $item->update([
            'invoice_status' => 'INVOICED',
            'payment_status' => 'PAID',
        ]);

        $item->refresh();
        $this->assertEquals('INVOICED', $item->invoice_status);
        $this->assertEquals('PAID', $item->payment_status);
    }

    public function test_stage_locks_and_role_validations()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-1002',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Item Lock test',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Design', 'Material', 'Machining', 'Fabrication', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();
        $fabStage = $item->itemProgresses()->where('stage_name', 'Fabrication')->first();
        $qcStage = $item->itemProgresses()->where('stage_name', 'QC')->first();
        $deliveryStage = $item->itemProgresses()->where('stage_name', 'Delivery')->first();

        // 1. Create MACHINING worker
        $machiningWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Machining Worker',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('1111'),
        ]);

        // 2. Create FABRICATION worker
        $fabWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Fabrication Worker',
            'role_id' => 4,
            'post_id' => 6,
            'pin' => bcrypt('2222'),
        ]);

        // 3. Create QC worker
        $qcWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'QC Worker',
            'role_id' => 6,
            'post_id' => 8,
            'pin' => bcrypt('3333'),
        ]);

        // 4. Create FINANCE worker
        $financeWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Finance Worker',
            'role_id' => 9,
            'post_id' => 10,
            'pin' => bcrypt('4444'),
        ]);

        // Test production stage is NOT blocked before Design/Material completed (Design starts at 50%, Material at 33%)
        $this->actingAs($machiningWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/update", ['completed_qty' => 5])->assertRedirect();

        // Complete Design & Material stages
        $item->itemProgresses()->whereIn('stage_name', ['Design', 'Material'])->update(['status' => 'COMPLETED', 'completed_qty' => 10]);

        // Test MACHINING worker trying to update Fabrication -> Blocked (403)
        $this->actingAs($machiningWorker);
        $response = $this->post("/c/{$this->tenant1->slug}/progress/{$fabStage->id}/update", ['completed_qty' => 5]);
        $response->assertStatus(403);

        // Test FABRICATION worker trying to update Machining -> Blocked (403)
        $this->actingAs($fabWorker);
        $response = $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/update", ['completed_qty' => 5]);
        $response->assertStatus(403);

        // Test QC worker trying to update QC stage before production is completed -> Blocked (403)
        $this->actingAs($qcWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$qcStage->id}/update", ['completed_qty' => 5])->assertStatus(403);

        // Complete Machining & Fabrication
        $this->actingAs($machiningWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/update", ['completed_qty' => 10])->assertRedirect();
        $this->actingAs($fabWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$fabStage->id}/update", ['completed_qty' => 10])->assertRedirect();

        // QC worker updates QC stage now that production is completed
        $this->actingAs($qcWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$qcStage->id}/update", ['completed_qty' => 5])->assertRedirect();

        // Delivery stage locked until QC completed_qty > 0.
        // Let's test a Delivery worker trying to update Delivery stage.
        $deliveryWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Delivery Worker',
            'role_id' => 7,
            'post_id' => 9,
            'pin' => bcrypt('5555'),
        ]);

        // Blocks if Delivery has no delivered qty yet
        $this->actingAs($financeWorker);
        $this->post("/c/{$this->tenant1->slug}/items/{$item->id}/finance", [
            'invoice_status' => 'INVOICED',
            'payment_status' => 'PAID',
        ])->assertStatus(403);

        $this->actingAs($deliveryWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$deliveryStage->id}/update", ['completed_qty' => 5])->assertRedirect();

        // Delivery update automatically creates DO and DoItem
        $this->assertDatabaseHas('delivery_orders', [
            'po_id' => $po->id,
            'do_number' => 'DO-'.$po->po_number,
        ]);
        $this->assertDatabaseHas('do_items', [
            'item_id' => $item->id,
            'delivered_qty' => 5,
        ]);

        // QC rework endpoint only restricted to QC role
        $this->actingAs($machiningWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/rework", ['reject_qty' => 2])->assertStatus(403);

        // Test Finance update status endpoint
        // Restrict role to FINANCE
        $this->actingAs($machiningWorker);
        $this->post("/c/{$this->tenant1->slug}/items/{$item->id}/finance", [
            'invoice_status' => 'INVOICED',
            'payment_status' => 'PAID',
        ])->assertStatus(403);

        // Partial delivery done (5/10) -> Finance can invoice now
        $this->actingAs($financeWorker);
        $this->post("/c/{$this->tenant1->slug}/items/{$item->id}/finance", [
            'invoice_status' => 'INVOICED',
            'payment_status' => 'PAID',
        ])->assertRedirect();

        // Complete Delivery stage
        $this->actingAs($deliveryWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$deliveryStage->id}/update", ['completed_qty' => 10])->assertRedirect();

        // Finance can update again after full delivery
        $this->actingAs($financeWorker);
        $this->post("/c/{$this->tenant1->slug}/items/{$item->id}/finance", [
            'invoice_status' => 'INVOICED',
            'payment_status' => 'PAID',
        ])->assertRedirect();

        $item->refresh();
        $this->assertEquals('INVOICED', $item->invoice_status);
        $this->assertEquals('PAID', $item->payment_status);

        // Ensure NO invoices table entry was created
        $this->assertEquals(0, Invoice::count());
    }

    public function test_off_state_locks()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-1003',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        // Item 1: Vendor job -> Machining, Fabrication, QC, Delivery are locked.
        $itemVendor = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Vendor job item',
            'target_qty' => 1,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Vendor', 'Machining'],
            'status' => 'PENDING',
        ]);

        $machiningStage = $itemVendor->itemProgresses()->where('stage_name', 'Machining')->first();

        $machiningWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Machining Worker 2',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('1111'),
        ]);

        $this->actingAs($machiningWorker);
        $response = $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/update", ['progress_percent' => 50.00]);
        $response->assertStatus(403);
    }

    public function test_finance_queue_filters_completed_items()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-1004',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        // Item 1: Active item
        $itemActive = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Active Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        // Item 2: Completed item that still needs billing (invoice_status is UNINVOICED)
        $itemCompletedUninvoiced = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Completed Uninvoiced Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
            'invoice_status' => 'UNINVOICED',
            'payment_status' => 'PAID',
        ]);
        foreach ($itemCompletedUninvoiced->itemProgresses as $progress) {
            $progress->update(['completed_qty' => 10, 'status' => 'COMPLETED']);
        }

        // Item 3: Completed item that still needs billing (payment_status is UNPAID)
        $itemCompletedUnpaid = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Completed Unpaid Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
            'invoice_status' => 'INVOICED',
            'payment_status' => 'UNPAID',
        ]);
        foreach ($itemCompletedUnpaid->itemProgresses as $progress) {
            $progress->update(['completed_qty' => 10, 'status' => 'COMPLETED']);
        }

        // Item 4: Completed and fully billed item (invoice_status is INVOICED and payment_status is PAID)
        $itemCompletedBilled = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Completed Billed Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
            'invoice_status' => 'INVOICED',
            'payment_status' => 'PAID',
        ]);
        foreach ($itemCompletedBilled->itemProgresses as $progress) {
            $progress->update(['completed_qty' => 10, 'status' => 'COMPLETED']);
        }

        // 1. Create FINANCE worker
        $financeWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Finance Worker Queue',
            'role_id' => 9,
            'post_id' => 10,
            'pin' => bcrypt('1111'),
        ]);

        // 2. Create MACHINING worker
        $machiningWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Machining Worker Queue',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('2222'),
        ]);

        // Access as FINANCE worker
        $this->actingAs($financeWorker);
        $response = $this->get("/c/{$this->tenant1->slug}");
        $response->assertStatus(200);
        $response->assertInertia(function ($page) use ($itemActive, $itemCompletedUninvoiced, $itemCompletedUnpaid, $itemCompletedBilled) {
            $items = $page->toArray()['props']['items'];
            $itemIds = collect($items)->pluck('id')->toArray();

            // FINANCE should see Active, Completed Uninvoiced, and Completed Unpaid items.
            $this->assertContains($itemActive->id, $itemIds);
            $this->assertContains($itemCompletedUninvoiced->id, $itemIds);
            $this->assertContains($itemCompletedUnpaid->id, $itemIds);

            // FINANCE should NOT see Completed Billed item.
            $this->assertNotContains($itemCompletedBilled->id, $itemIds);
        });

        // Access as MACHINING worker
        $this->actingAs($machiningWorker);
        $response = $this->get("/c/{$this->tenant1->slug}");
        $response->assertStatus(200);
        $response->assertInertia(function ($page) use ($itemActive, $itemCompletedUninvoiced, $itemCompletedUnpaid, $itemCompletedBilled) {
            $items = $page->toArray()['props']['items'];
            $itemIds = collect($items)->pluck('id')->toArray();

            // MACHINING should see Active item.
            $this->assertContains($itemActive->id, $itemIds);

            // MACHINING should NOT see any completed items.
            $this->assertNotContains($itemCompletedUninvoiced->id, $itemIds);
            $this->assertNotContains($itemCompletedUnpaid->id, $itemIds);
            $this->assertNotContains($itemCompletedBilled->id, $itemIds);
        });
    }

    public function test_lapor_kendala_captures_note_and_can_be_listed()
    {
        Event::fake([KendalaReported::class]);
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-TEST-NOTE',
            'client_name' => 'Note Client',
            'global_deadline' => now()->addDays(5),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Note Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $item->itemProgresses()->whereIn('stage_name', ['Design', 'Material'])->update(['status' => 'COMPLETED', 'completed_qty' => 10]);

        $worker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Machining Worker',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('1234'),
        ]);
        $this->actingAs($worker);

        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();

        // Worker reports kendala with custom note
        $response = $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/kendala", [
            'kendala_type' => 'Machine Broken',
            'note' => 'Custom breakdown details here',
        ]);

        $response->assertRedirect();

        // Assert RED alert was logged with note
        $this->assertDatabaseHas('alerts', [
            'item_id' => $item->id,
            'severity' => 'RED',
            'is_resolved' => false,
        ]);

        $alert = Alert::where('item_id', $item->id)->first();
        $this->assertStringContainsString('Custom breakdown details here', $alert->message);

        // Fetch trouble reports page
        $responseList = $this->get("/c/{$this->tenant1->slug}/trouble-reports");
        $responseList->assertStatus(200);
        $responseList->assertInertia(function ($page) use ($alert) {
            $alerts = $page->toArray()['props']['alerts'];
            $alertIds = collect($alerts)->pluck('id')->toArray();
            $this->assertContains($alert->id, $alertIds);
        });
    }

    public function test_revert_last_progress_update()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-TEST-REVERT',
            'client_name' => 'Revert Client',
            'global_deadline' => now()->addDays(5),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Revert Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC'],
            'status' => 'PENDING',
        ]);

        $item->itemProgresses()->whereIn('stage_name', ['Design', 'Material'])->update(['status' => 'COMPLETED', 'completed_qty' => 10]);

        $worker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'CNC Worker',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('1234'),
        ]);
        $this->actingAs($worker);

        $cncStage = $item->itemProgresses()->where('stage_name', 'CNC')->first();

        // 1. Log progress
        $response = $this->post("/c/{$this->tenant1->slug}/progress/{$cncStage->id}/update", [
            'completed_qty' => 5,
        ]);
        $response->assertRedirect();
        $this->assertEquals(5, $cncStage->refresh()->completed_qty);
        $this->assertEquals(0, $cncStage->previous_completed_qty); // Stored original

        // 2. Revert progress
        $responseRevert = $this->post("/c/{$this->tenant1->slug}/progress/{$cncStage->id}/cancel-last-update");
        $responseRevert->assertRedirect();
        $this->assertEquals(0, $cncStage->refresh()->completed_qty);
        $this->assertNull($cncStage->previous_completed_qty);
    }

    public function test_finance_role_cannot_update_cnc_or_fabrication()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-TEST-ROLE',
            'client_name' => 'Role Client',
            'global_deadline' => now()->addDays(5),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Role Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['CNC', 'FABRIKASI'],
            'status' => 'PENDING',
        ]);

        $financeWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Finance Worker',
            'role_id' => 9,
            'post_id' => 10,
            'pin' => bcrypt('1234'),
        ]);
        $this->actingAs($financeWorker);

        $cncStage = $item->itemProgresses()->where('stage_name', 'CNC')->first();

        // Try to update CNC stage - should fail with 403
        $response = $this->post("/c/{$this->tenant1->slug}/progress/{$cncStage->id}/update", [
            'completed_qty' => 5,
        ]);
        $response->assertStatus(403);
    }

    public function test_drafter_and_purchasing_role_stage_updates()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-TEST-DRAFT-PURCH',
            'client_name' => 'Draft Purch Client',
            'global_deadline' => now()->addDays(5),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Draft Purch Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Design', 'Material', 'CNC'],
            'status' => 'PENDING',
        ]);

        $drafter = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Drafter Worker',
            'role_id' => 1,
            'post_id' => 1,
            'pin' => bcrypt('1111'),
        ]);

        $purchasing = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Purchasing Worker',
            'role_id' => 2,
            'post_id' => 2,
            'pin' => bcrypt('2222'),
        ]);

        $designStage = $item->itemProgresses()->where('stage_name', 'Design')->first();
        $materialStage = $item->itemProgresses()->where('stage_name', 'Material')->first();

        // 1. Drafter can update Design stage
        $this->actingAs($drafter);
        $responseDesign = $this->post("/c/{$this->tenant1->slug}/progress/{$designStage->id}/update", [
            'progress_percent' => 50.00,
        ]);
        $responseDesign->assertRedirect();
        $this->assertEquals(50.00, $designStage->refresh()->progress_percent);
        $this->assertEquals(5, $designStage->completed_qty);

        // Approve Design (100%)
        $responseDesignApprove = $this->post("/c/{$this->tenant1->slug}/progress/{$designStage->id}/update", [
            'progress_percent' => 100.00,
        ]);
        $responseDesignApprove->assertRedirect();
        $this->assertEquals(100.00, $designStage->refresh()->progress_percent);
        $this->assertEquals(10, $designStage->completed_qty);

        // 2. Drafter cannot update Material stage
        $responseDesignMaterial = $this->post("/c/{$this->tenant1->slug}/progress/{$materialStage->id}/update", [
            'progress_percent' => 100.00,
        ]);
        $responseDesignMaterial->assertStatus(403);

        // 3. Purchasing can update Material stage (Order: 33%, Proses: 66%, Complete: 100%)
        $this->actingAs($purchasing);
        $responseMaterialOrder = $this->post("/c/{$this->tenant1->slug}/progress/{$materialStage->id}/update", [
            'progress_percent' => 33.00,
        ]);
        $responseMaterialOrder->assertRedirect();
        $this->assertEquals(33.00, $materialStage->refresh()->progress_percent);
        $this->assertEquals(3, $materialStage->completed_qty); // round(10 * 0.33)

        $responseMaterialProses = $this->post("/c/{$this->tenant1->slug}/progress/{$materialStage->id}/update", [
            'progress_percent' => 66.00,
        ]);
        $responseMaterialProses->assertRedirect();
        $this->assertEquals(66.00, $materialStage->refresh()->progress_percent);
        $this->assertEquals(7, $materialStage->completed_qty); // round(10 * 0.66)

        $responseMaterialComplete = $this->post("/c/{$this->tenant1->slug}/progress/{$materialStage->id}/update", [
            'progress_percent' => 100.00,
        ]);
        $responseMaterialComplete->assertRedirect();
        $this->assertEquals(100.00, $materialStage->refresh()->progress_percent);
        $this->assertEquals(10, $materialStage->completed_qty);

        // 4. Purchasing cannot update Design stage
        $responsePurchasingDesign = $this->post("/c/{$this->tenant1->slug}/progress/{$designStage->id}/update", [
            'progress_percent' => 100.00,
        ]);
        $responsePurchasingDesign->assertStatus(403);
    }

    public function test_cancel_last_update_on_custom_stages()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-TEST-REVERT-CUSTOM',
            'client_name' => 'Revert Custom Client',
            'global_deadline' => now()->addDays(5),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Revert Custom Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Design', 'Material', 'CNC'],
            'status' => 'PENDING',
        ]);

        $drafter = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Drafter Worker Revert',
            'role_id' => 1,
            'post_id' => 1,
            'pin' => bcrypt('1111'),
        ]);

        $purchasing = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Purchasing Worker Revert',
            'role_id' => 2,
            'post_id' => 2,
            'pin' => bcrypt('2222'),
        ]);

        $designStage = $item->itemProgresses()->where('stage_name', 'Design')->first();
        $materialStage = $item->itemProgresses()->where('stage_name', 'Material')->first();

        // Warm-start Design & Material progress values expected by this test
        $designStage->update(['progress_percent' => 50.00, 'status' => 'IN_PROGRESS']);
        $materialStage->update(['progress_percent' => 33.00, 'status' => 'IN_PROGRESS']);

        // 1. Drafter updates design to APPROVED (100%)
        $this->actingAs($drafter);
        $this->post("/c/{$this->tenant1->slug}/items/{$item->id}/drafter-status", [
            'drafter_status' => 'APPROVED',
        ])->assertRedirect();

        $item->refresh();
        $this->assertEquals('APPROVED', $item->drafter_status);
        $this->assertEquals(100.00, $designStage->refresh()->progress_percent);
        $this->assertEquals('COMPLETED', $designStage->status);

        // Revert Design
        $this->post("/c/{$this->tenant1->slug}/progress/{$designStage->id}/cancel-last-update")->assertRedirect();
        $item->refresh();
        // Should revert to DRAWING since original initial design progress_percent is 50.00%
        $this->assertEquals('DRAWING', $item->drafter_status);
        $this->assertEquals(50.00, $designStage->refresh()->progress_percent);
        $this->assertEquals('IN_PROGRESS', $designStage->status);

        // 2. Purchasing updates material to READY (100%)
        $this->actingAs($purchasing);
        $this->post("/c/{$this->tenant1->slug}/items/{$item->id}/purchasing-status", [
            'purchasing_status' => 'READY',
        ])->assertRedirect();

        $item->refresh();
        $this->assertEquals('READY', $item->purchasing_status);
        $this->assertEquals(100.00, $materialStage->refresh()->progress_percent);
        $this->assertEquals('COMPLETED', $materialStage->status);

        // Revert Material
        $this->post("/c/{$this->tenant1->slug}/progress/{$materialStage->id}/cancel-last-update")->assertRedirect();
        $item->refresh();
        // Should revert to ORDER since original initial material progress_percent is 33.00%
        $this->assertEquals('ORDER', $item->purchasing_status);
        $this->assertEquals(33.00, $materialStage->refresh()->progress_percent);
        $this->assertEquals('IN_PROGRESS', $materialStage->status);
    }

    public function test_customizable_workflow_modes_and_validation_gates()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-WF-TEST',
            'client_name' => 'WF Client',
            'global_deadline' => now()->addDays(5),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'WF Test Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Design', 'Material', 'Machining'],
            'status' => 'PENDING',
        ]);

        $designStage = $item->itemProgresses()->where('stage_name', 'Design')->first();
        $materialStage = $item->itemProgresses()->where('stage_name', 'Material')->first();
        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();

        // 1. By default, workflow mode is Loose (null/loose settings).
        // Let's create a machining operator.
        $operator = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Machining Operator',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('1111'),
        ]);

        // In Loose mode, operator can update Machining progress even if Design and Material are PENDING (0%)
        $this->actingAs($operator);
        $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/update", ['completed_qty' => 5])
            ->assertRedirect();

        $machiningStage->refresh();
        $this->assertEquals(5, $machiningStage->completed_qty);

        // Reset machining progress
        $machiningStage->update(['completed_qty' => 0, 'status' => 'PENDING', 'progress_percent' => 0]);

        // 2. Change workflow settings to Strict
        $owner = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Owner Admin',
            'role_id' => 8,
            'post_id' => 12,
            'email' => 'owner.wf@example.com',
            'password' => bcrypt('password'),
        ]);
        $this->actingAs($owner);

        $this->post('/company/workflow-settings', [
            'workflow_mode' => 'strict',
            'require_design_approved_for_production' => true,
            'require_material_ready_for_production' => true,
        ])->assertRedirect();

        // Try updating Machining as operator -> should be BLOCKED (403)
        $this->actingAs($operator);
        $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/update", ['completed_qty' => 5])
            ->assertStatus(403);

        // 3. Complete Design and Material
        $designStage->update(['status' => 'COMPLETED', 'progress_percent' => 100.00]);
        $materialStage->update(['status' => 'COMPLETED', 'progress_percent' => 100.00]);

        // Try updating Machining again -> should be ALLOWED now
        $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/update", ['completed_qty' => 5])
            ->assertRedirect();

        $machiningStage->refresh();
        $this->assertEquals(5, $machiningStage->completed_qty);
    }

    public function test_partial_invoicing_and_payment_status()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-BILL-TEST',
            'client_name' => 'Bill Client',
            'global_deadline' => now()->addDays(5),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Bill Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Design', 'Material', 'Delivery'],
            'status' => 'PENDING',
        ]);

        $deliveryStage = $item->itemProgresses()->where('stage_name', 'Delivery')->first();

        $financeRole = DB::table('roles')->where('name', 'FINANCE')->first();
        $financePost = DB::table('posts')->where('name', 'Finance')->first();

        // 1. Create Finance operator
        $financeOperator = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Finance Operator',
            'role_id' => $financeRole->id,
            'post_id' => $financePost->id,
            'pin' => bcrypt('1111'),
        ]);

        // Complete Design/Material and update Delivery to let Finance update status (due to delivery check)
        $item->itemProgresses()->whereIn('stage_name', ['Design', 'Material'])->update(['status' => 'COMPLETED', 'completed_qty' => 10]);
        $deliveryStage->update(['status' => 'COMPLETED', 'completed_qty' => 10]);

        // Create DoItem so delivered_qty > 0 for finance gate
        $do = DeliveryOrder::create(['po_id' => $po->id, 'do_number' => 'DO-BILL', 'delivery_date' => now()]);
        DoItem::create(['delivery_order_id' => $do->id, 'item_id' => $item->id, 'delivered_qty' => 10]);
        $item->refresh();

        $this->actingAs($financeOperator);

        // Test PARTIAL invoice update
        $this->post("/c/{$this->tenant1->slug}/items/{$item->id}/finance", [
            'invoice_status' => 'PARTIAL',
            'payment_status' => 'PARTIAL_PAID',
            'invoiced_qty' => 5,
        ])->assertRedirect();

        $item->refresh();
        $this->assertEquals('PARTIAL', $item->invoice_status);
        $this->assertEquals('PARTIAL_PAID', $item->payment_status);
        $this->assertEquals(5, $item->invoiced_qty);

        // Test fully INVOICED and PAID
        $this->post("/c/{$this->tenant1->slug}/items/{$item->id}/finance", [
            'invoice_status' => 'INVOICED',
            'payment_status' => 'PAID',
            'invoiced_qty' => 10,
        ])->assertRedirect();

        $item->refresh();
        $this->assertEquals('INVOICED', $item->invoice_status);
        $this->assertEquals('PAID', $item->payment_status);
        $this->assertEquals(10, $item->invoiced_qty);

        // PO should be CLOSED now
        $po->refresh();
        $this->assertEquals('CLOSED', $po->status);
    }

    public function test_additive_progress_same_stage()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-ADDITIVE',
            'client_name' => 'Additive Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Additive Item',
            'target_qty' => 20,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();

        // CNC worker (role 3) updates to 5
        $cncWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'CNC Worker',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('1111'),
        ]);
        $this->actingAs($cncWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/update", ['completed_qty' => 5])
            ->assertRedirect();

        $machiningStage->refresh();
        $this->assertEquals(5, $machiningStage->completed_qty);

        // Milling worker (also role 3 but different post 3 for Milling) updates same stage
        $millingWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Milling Worker',
            'role_id' => 3,
            'post_id' => 3,
            'pin' => bcrypt('2222'),
        ]);
        $this->actingAs($millingWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$machiningStage->id}/update", ['completed_qty' => 3])
            ->assertRedirect();

        // Additive: 5 + 3 = 8
        $machiningStage->refresh();
        $this->assertEquals(8, $machiningStage->completed_qty);
    }

    public function test_qc_generic_gate_surface_treatment()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-QC-SURFACE',
            'client_name' => 'QC Surface Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'QC Surface Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Surface Treatment', 'QC'],
            'status' => 'PENDING',
        ]);

        $surfaceStage = $item->itemProgresses()->where('stage_name', 'Surface Treatment')->first();
        $qcStage = $item->itemProgresses()->where('stage_name', 'QC')->first();

        $qcWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'QC Worker Surface',
            'role_id' => 6,
            'post_id' => 8,
            'pin' => bcrypt('1111'),
        ]);

        // QC cannot update QC stage before Surface Treatment is COMPLETED
        $this->actingAs($qcWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$qcStage->id}/update", ['completed_qty' => 5])
            ->assertStatus(403);

        // Complete Surface Treatment
        $surfaceStage->update(['completed_qty' => 10, 'status' => 'COMPLETED']);

        // Now QC can update
        $this->post("/c/{$this->tenant1->slug}/progress/{$qcStage->id}/update", ['completed_qty' => 5])
            ->assertRedirect();
    }

    public function test_delivery_additive_total()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-DEL-ADD',
            'client_name' => 'Delivery Add Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Delivery Add Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        // Complete preceding stages so Delivery is allowed
        $item->itemProgresses()->whereIn('stage_name', ['Machining', 'QC'])->update(['completed_qty' => 10, 'status' => 'COMPLETED']);

        $deliveryStage = $item->itemProgresses()->where('stage_name', 'Delivery')->first();

        $deliveryWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Delivery Worker Add',
            'role_id' => 7,
            'post_id' => 9,
            'pin' => bcrypt('1111'),
        ]);
        $this->actingAs($deliveryWorker);

        // First delivery: 3 pcs
        $this->post("/c/{$this->tenant1->slug}/progress/{$deliveryStage->id}/update", ['completed_qty' => 3])
            ->assertRedirect();

        $deliveryStage->refresh();
        $this->assertEquals(3, $deliveryStage->completed_qty);

        // Second delivery: 2 more pcs (additive)
        $this->post("/c/{$this->tenant1->slug}/progress/{$deliveryStage->id}/update", ['completed_qty' => 2])
            ->assertRedirect();

        $deliveryStage->refresh();
        $this->assertEquals(5, $deliveryStage->completed_qty);

        // Assert DoItem is also additive: total = 5
        $this->assertEquals(5, $item->doItems()->sum('delivered_qty'));
    }

    public function test_po_completed_delivered_closed_lifecycle()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-LIFECYCLE',
            'client_name' => 'Lifecycle Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Lifecycle Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        // Complete all progress stages via model instances so observer fires
        foreach (['Machining', 'QC', 'Delivery'] as $stage) {
            $progress = $item->itemProgresses()->where('stage_name', $stage)->first();
            $progress->update(['completed_qty' => 10, 'status' => 'COMPLETED']);
        }
        $item->refresh();
        $this->assertEquals('COMPLETED', $item->status);

        $po->refresh();
        $this->assertEquals('COMPLETED', $po->status);

        // Deliver via DO → PO DELIVERED
        $do = DeliveryOrder::create(['po_id' => $po->id, 'do_number' => 'DO-LIFE', 'delivery_date' => now()]);
        DoItem::create(['delivery_order_id' => $do->id, 'item_id' => $item->id, 'delivered_qty' => 10]);

        $po->refresh();
        $this->assertEquals('DELIVERED', $po->status);

        // Must use finance endpoint to trigger CLOSED cascade
        $financeRole = DB::table('roles')->where('name', 'FINANCE')->first();
        $financePost = DB::table('posts')->where('name', 'Finance')->first();
        $financeWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Finance Lifecycle',
            'role_id' => $financeRole->id,
            'post_id' => $financePost->id,
            'pin' => bcrypt('1111'),
        ]);
        $this->actingAs($financeWorker);
        $this->post("/c/{$this->tenant1->slug}/items/{$item->id}/finance", [
            'invoice_status' => 'INVOICED',
            'payment_status' => 'PAID',
        ])->assertRedirect();

        $po->refresh();
        $this->assertEquals('CLOSED', $po->status);
    }

    public function test_item_delivery_status_transitions()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-DEL-STATUS',
            'client_name' => 'Delivery Status Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Delivery Status Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Delivery'],
            'status' => 'PENDING',
        ]);

        // Initially PENDING
        $this->assertEquals('PENDING', $item->refresh()->delivery_status);

        // Deliver partially → PARTIAL
        $do = DeliveryOrder::create(['po_id' => $po->id, 'do_number' => 'DO-STATUS', 'delivery_date' => now()]);
        DoItem::create(['delivery_order_id' => $do->id, 'item_id' => $item->id, 'delivered_qty' => 4]);

        $item->refresh();
        $this->assertEquals('PARTIAL', $item->delivery_status);

        // Deliver fully → DELIVERED
        DoItem::create(['delivery_order_id' => $do->id, 'item_id' => $item->id, 'delivered_qty' => 6]);

        $item->refresh();
        $this->assertEquals('DELIVERED', $item->delivery_status);
    }

    public function test_surface_role_can_update_surface_treatment()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-SURFACE',
            'client_name' => 'Surface Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Surface Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Surface Treatment'],
            'status' => 'PENDING',
        ]);

        $surfaceStage = $item->itemProgresses()->where('stage_name', 'Surface Treatment')->first();

        $surfaceRole = DB::table('roles')->where('name', 'SURFACE')->first();
        $surfacePost = DB::table('posts')->where('name', 'HEAT_TREATMENT')->first();

        $surfaceWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Surface Worker',
            'role_id' => $surfaceRole->id,
            'post_id' => $surfacePost->id,
            'pin' => bcrypt('1111'),
        ]);

        // SURFACE role can update Surface Treatment stage
        $this->actingAs($surfaceWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$surfaceStage->id}/update", ['completed_qty' => 5])
            ->assertRedirect();

        $surfaceStage->refresh();
        $this->assertEquals(5, $surfaceStage->completed_qty);

        // MACHINING role cannot update Surface Treatment
        $machiningWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Machining Worker Surface',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('2222'),
        ]);
        $this->actingAs($machiningWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$surfaceStage->id}/update", ['completed_qty' => 3])
            ->assertStatus(403);
    }

    public function test_assembly_role_can_update_assembly()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-ASSEMBLY',
            'client_name' => 'Assembly Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Assembly Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Assembly'],
            'status' => 'PENDING',
        ]);

        $assemblyStage = $item->itemProgresses()->where('stage_name', 'Assembly')->first();

        $assemblyRole = DB::table('roles')->where('name', 'ASSEMBLY')->first();
        $assemblyPost = DB::table('posts')->where('name', 'ASSEMBLY')->first();

        $assemblyWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'Assembly Worker',
            'role_id' => $assemblyRole->id,
            'post_id' => $assemblyPost->id,
            'pin' => bcrypt('1111'),
        ]);

        $this->actingAs($assemblyWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$assemblyStage->id}/update", ['completed_qty' => 7])
            ->assertRedirect();

        $assemblyStage->refresh();
        $this->assertEquals(7, $assemblyStage->completed_qty);

        // QC role cannot update Assembly stage
        $qcWorker = User::create([
            'tenant_id' => $this->tenant1->id,
            'name' => 'QC Worker Assembly',
            'role_id' => 6,
            'post_id' => 8,
            'pin' => bcrypt('2222'),
        ]);
        $this->actingAs($qcWorker);
        $this->post("/c/{$this->tenant1->slug}/progress/{$assemblyStage->id}/update", ['completed_qty' => 3])
            ->assertStatus(403);
    }

    public function test_no_auto_injection_when_item_created()
    {
        TenantManager::setTenantId($this->tenant1->id);

        $po = Po::create([
            'po_number' => 'PO-NO-INJECT',
            'client_name' => 'No Inject Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'No Inject Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        // Only 1 stage should exist — no auto-injected Design/Material/QC/Delivery
        $this->assertEquals(1, $item->itemProgresses()->count());
        $this->assertEquals('Machining', $item->itemProgresses()->first()->stage_name);
        $this->assertEquals(['Machining'], $item->required_stages);
    }
}
