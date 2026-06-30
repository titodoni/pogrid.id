<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\DeliveryOrder;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PerformanceMatrixTest extends TestCase
{
    use RefreshDatabase;

    private $tenant;

    private $owner;

    private $worker;

    protected function setUp(): void
    {
        parent::setUp();

        // Base Tenant & Users setup
        TenantManager::bypass();
        $this->tenant = Tenant::create([
            'company_name' => 'Test Tech',
            'slug' => 'test-tech',
        ]);

        $this->owner = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Owner Budi',
            'role' => 'OWNER',
            'username' => 'owner.budi',
            'password' => bcrypt('password123'),
        ]);

        $this->worker = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Worker Joko',
            'role' => 'WORKER',
            'pin' => bcrypt('1234'),
        ]);
        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);
    }

    public function test_matrix_dashboard_access_restricted_to_office_roles()
    {
        // 1. Office User (OWNER) can access matrix and gets telemetry props
        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}");
        $response->assertStatus(200);
        $response->assertInertia(function ($page) {
            $page->has('telemetry')
                ->has('selected_range');
        });

        // 2. Floor User (WORKER) gets shown the worker dashboard without telemetry
        $this->actingAs($this->worker);
        $response = $this->get("/c/{$this->tenant->slug}");
        $response->assertStatus(200);
        $response->assertInertia(function ($page) {
            $props = $page->toArray()['props'];
            $this->assertArrayNotHasKey('telemetry', $props);
            $this->assertArrayNotHasKey('selected_range', $props);
            $page->has('items');
        });
    }

    public function test_metrics_isolated_to_active_tenant()
    {
        TenantManager::bypass();
        // Create another tenant and a PO for them
        $otherTenant = Tenant::create([
            'company_name' => 'Other Tenant',
            'slug' => 'other-tenant',
        ]);
        $otherPo = Po::create([
            'tenant_id' => $otherTenant->id,
            'po_number' => 'PO-OTHER',
            'client_name' => 'Client Other',
            'global_deadline' => now()->subDays(2)->toDateString(),
            'status' => 'PENDING',
        ]);
        $item = Item::create([
            'tenant_id' => $otherTenant->id,
            'po_id' => $otherPo->id,
            'item_name' => 'Other Part',
            'item_type' => 'MANUFACTURE',
            'target_qty' => 10,
            'required_stages' => ['Machining'],
        ]);

        $progress = ItemProgress::where('item_id', $item->id)->first();
        if ($progress) {
            $progress->update([
                'completed_qty' => 5,
                'progress_percent' => 50.00,
                'status' => 'IN_PROGRESS',
            ]);
        }

        // Access main tenant dashboard
        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}");

        $response->assertStatus(200);
        $response->assertInertia(function ($page) {
            // Target manufacture should be 0 because the other tenant's PO must be isolated
            $page->where('telemetry.manufacture.target', 0)
                ->where('telemetry.manufacture.completed', 0);
        });
    }

    public function test_on_time_delivery_rate_calculation()
    {
        TenantManager::bypass();
        // Create 2 POs: 1 on-time and 1 delayed
        $po1 = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-1',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(2)->toDateString(),
            'status' => 'COMPLETED',
        ]);
        $do1 = DeliveryOrder::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po1->id,
            'do_number' => 'DO-1',
            'delivery_date' => now()->toDateString(),
        ]);

        $po2 = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-2',
            'client_name' => 'Client B',
            'global_deadline' => now()->subDays(5)->toDateString(),
            'status' => 'COMPLETED',
        ]);
        $do2 = DeliveryOrder::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po2->id,
            'do_number' => 'DO-2',
            'delivery_date' => now()->toDateString(), // 5 days late
        ]);

        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}?range=month");

        $response->assertInertia(function ($page) {
            // 1 out of 2 is on time (50%)
            $page->where('telemetry.otdr', 50);
        });
    }

    public function test_manufactured_volume_calculation_precision()
    {
        TenantManager::bypass();
        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-3',
            'client_name' => 'Client C',
            'global_deadline' => now()->addDays(5)->toDateString(),
            'status' => 'PENDING',
        ]);

        // Item 1: 10 target, 60% progress = 6 completed
        $item1 = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Shaft A',
            'item_type' => 'MANUFACTURE',
            'target_qty' => 10,
            'required_stages' => ['Machining'],
        ]);
        foreach ($item1->itemProgresses as $progress1) {
            $progress1->update([
                'completed_qty' => 6,
                'progress_percent' => 60.00,
                'status' => 'IN_PROGRESS',
            ]);
        }

        // Item 2: 5 target, 100% progress = 5 completed
        $item2 = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Bracket B',
            'item_type' => 'MANUFACTURE',
            'target_qty' => 5,
            'required_stages' => ['Machining'],
        ]);
        foreach ($item2->itemProgresses as $progress2) {
            $progress2->update([
                'completed_qty' => 5,
                'progress_percent' => 100.00,
                'status' => 'COMPLETED',
            ]);
        }

        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}?range=month");

        $response->assertInertia(function ($page) {
            $page->where('telemetry.manufacture.target', 15)
                ->where('telemetry.manufacture.completed', 11);
        });
    }

    public function test_bottleneck_stage_analyzer_aggregations()
    {
        TenantManager::bypass();
        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-4',
            'client_name' => 'Client D',
            'global_deadline' => now()->addDays(5)->toDateString(),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Gear',
            'item_type' => 'MANUFACTURE',
            'target_qty' => 10,
            'required_stages' => ['Machining'],
        ]);

        // Add 1 stuck progress on Machining
        $progress = ItemProgress::where('item_id', $item->id)->where('stage_name', 'Machining')->first();
        if ($progress) {
            $progress->update([
                'status' => 'STUCK',
            ]);
        }

        // Add 1 RED alert on Machining
        Alert::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $item->id,
            'severity' => 'RED',
            'message' => "Stuck: Machine Broken on stage 'Machining' for item 'Gear' (PO: PO-4).",
            'is_resolved' => false,
        ]);

        // Add 1 YELLOW alert on Machining (QC Rework)
        Alert::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $item->id,
            'severity' => 'YELLOW',
            'message' => "QC Rework: 2 items rejected on stage 'Machining' for item 'Gear' (PO: PO-4).",
            'is_resolved' => false,
        ]);

        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}?range=month");

        $response->assertInertia(function ($page) {
            $metrics = collect($page->toArray()['props']['telemetry']['stage_metrics']);
            $machiningMetric = $metrics->firstWhere('stage', 'Machining');

            $this->assertNotNull($machiningMetric);
            $this->assertEquals(1, $machiningMetric['active_items']);
            $this->assertEquals(1, $machiningMetric['stuck_count']);
            $this->assertEquals(1, $machiningMetric['rework_count']);

            $delayed = collect($page->toArray()['props']['telemetry']['delayed_items']);
            $this->assertCount(1, $delayed);
            $this->assertEquals('PO-4', $delayed[0]['po_number']);
            $this->assertEquals('Client D', $delayed[0]['client_name']);
            $this->assertEquals('Gear', $delayed[0]['item_name']);
            $this->assertStringContainsString('Machine Broken', $delayed[0]['reason']);
        });
    }

    public function test_pdf_export_downloads_correct_document()
    {
        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}/export-pdf?range=month");

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');
    }
}
