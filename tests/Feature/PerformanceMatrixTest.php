<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\DeliveryOrder;
use App\Models\DoItem;
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
            'role_id' => 8,
            'post_id' => 13,
            'is_owner' => true,
            'username' => 'owner.budi',
            'password' => bcrypt('password123'),
        ]);

        $this->worker = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Worker Joko',
            'role_id' => 5,
            'post_id' => 7,
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
        // Create 2 POs: 1 on-time and 1 delayed.
        // Deadlines must fall within the 'month' range (last 30 days)
        // so the fixed OTDR formula (filters by global_deadline) picks them up.
        $po1 = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-1',
            'client_name' => 'Client A',
            'global_deadline' => now()->subDays(5)->toDateString(), // deadline in range
            'status' => 'COMPLETED',
        ]);
        $do1 = DeliveryOrder::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po1->id,
            'do_number' => 'DO-1',
            'delivery_date' => now()->subDays(6)->toDateString(), // delivered 1 day early = on time
        ]);

        $po2 = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-2',
            'client_name' => 'Client B',
            'global_deadline' => now()->subDays(10)->toDateString(), // deadline in range
            'status' => 'COMPLETED',
        ]);
        $do2 = DeliveryOrder::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po2->id,
            'do_number' => 'DO-2',
            'delivery_date' => now()->toDateString(), // delivered today = 10 days late
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

        // Item 1: 10 target, 6 delivered via DoItem
        $item1 = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Shaft A',
            'item_type' => 'MANUFACTURE',
            'target_qty' => 10,
            'required_stages' => ['Machining'],
        ]);

        // Create a DeliveryOrder and DoItem to record real delivery
        $do1 = DeliveryOrder::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'do_number' => 'DO-ITEM1',
            'delivery_date' => now()->toDateString(),
        ]);
        DoItem::create([
            'delivery_order_id' => $do1->id,
            'item_id' => $item1->id,
            'delivered_qty' => 6,
        ]);

        // Item 2: 5 target, 5 delivered via DoItem
        $item2 = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Bracket B',
            'item_type' => 'MANUFACTURE',
            'target_qty' => 5,
            'required_stages' => ['Machining'],
        ]);
        DoItem::create([
            'delivery_order_id' => $do1->id,
            'item_id' => $item2->id,
            'delivered_qty' => 5,
        ]);

        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}?range=month");

        $response->assertInertia(function ($page) {
            // Target = 15 (10 + 5), delivered = 11 (6 + 5)
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
            $productionMetric = $metrics->firstWhere('stage', 'Production');

            $this->assertNotNull($productionMetric);
            $this->assertEquals(1, $productionMetric['active_items']);
            $this->assertEquals(1, $productionMetric['stuck_count']);
            $this->assertEquals(1, $productionMetric['rework_count']);

            $delayed = collect($page->toArray()['props']['telemetry']['delayed_items']);
            $this->assertCount(1, $delayed);
            $this->assertEquals('PO-4', $delayed[0]['po_number']);
            $this->assertEquals('Client D', $delayed[0]['client_name']);
            $this->assertEquals('Gear', $delayed[0]['item_name']);
            $this->assertStringContainsString('Machine Broken', $delayed[0]['reason']);
        });
    }

    public function test_client_health_and_finance_health_aggregations()
    {
        TenantManager::bypass();

        // Create PO 1: completed, client = Client X, uninvoiced item
        $po1 = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-C1',
            'client_name' => 'Client X',
            'global_deadline' => now()->subDays(5)->toDateString(),
            'status' => 'COMPLETED',
        ]);
        $item1 = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po1->id,
            'item_name' => 'Part X',
            'item_type' => 'MANUFACTURE',
            'target_qty' => 5,
            'required_stages' => ['Machining'],
            'invoice_status' => 'UNINVOICED',
            'payment_status' => 'UNPAID',
        ]);

        // Create PO 2: pending (active), client = Client Y
        $po2 = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-C2',
            'client_name' => 'Client Y',
            'global_deadline' => now()->subDays(10)->toDateString(), // overdue
            'status' => 'PENDING',
            'is_urgent' => true,
        ]);
        $item2 = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po2->id,
            'item_name' => 'Part Y',
            'item_type' => 'MANUFACTURE',
            'target_qty' => 3,
            'required_stages' => ['Machining'],
            'invoice_status' => 'UNINVOICED',
            'payment_status' => 'UNPAID',
        ]);

        // Create a BLUE alert for PO 2 (makes it URGENT)
        Alert::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $item2->id,
            'severity' => 'BLUE',
            'message' => 'Blue alert',
            'is_resolved' => false,
        ]);

        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}?range=month");

        $response->assertInertia(function ($page) {
            $telemetry = $page->toArray()['props']['telemetry'];

            // Urgent count should be 1 (due to active BLUE alert on PO2 item)
            $this->assertEquals(1, $telemetry['urgent_active']);

            // Finance health counts:
            // $item1 has invoice_status UNINVOICED and PO status COMPLETED -> uninvoiced_count = 1
            // $item1 payment_status UNPAID but invoice_status is UNINVOICED -> not counted as unpaid yet
            // $item2 has payment_status UNPAID but invoice_status is UNINVOICED -> not counted as unpaid yet
            $this->assertEquals(1, $telemetry['finance_health']['uninvoiced_count']);
            $this->assertEquals(0, $telemetry['finance_health']['unpaid_count']);

            // Client health lists
            $clientHealth = collect($telemetry['client_health']);
            $this->assertCount(2, $clientHealth);

            // Client Y should be sorted first because it has overdue items (risk score higher)
            $clientY = $clientHealth->firstWhere('client_name', 'Client Y');
            $this->assertNotNull($clientY);
            $this->assertEquals(1, $clientY['active_pos']);
            $this->assertEquals(1, $clientY['overdue_items']); // PO2 is pending and overdue

            $clientX = $clientHealth->firstWhere('client_name', 'Client X');
            $this->assertNotNull($clientX);
            $this->assertEquals(0, $clientX['active_pos']);
            $this->assertEquals(1, $clientX['uninvoiced_count']); // completed item is UNINVOICED
        });
    }

    public function test_pdf_export_downloads_correct_document()
    {
        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}/export-pdf?range=month");

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');
    }

    public function test_csv_export_downloads_correct_document()
    {
        TenantManager::bypass();
        Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-CSV-1',
            'client_name' => 'CSV Client',
            'global_deadline' => now()->addDays(5)->toDateString(),
            'status' => 'PENDING',
        ]);
        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}/export-csv?range=month");

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('.csv', $response->headers->get('content-disposition'));
    }

    public function test_xlsx_export_downloads_correct_document()
    {
        TenantManager::bypass();
        Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-XLSX-1',
            'client_name' => 'XLSX Client',
            'global_deadline' => now()->addDays(5)->toDateString(),
            'status' => 'PENDING',
        ]);
        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}/export-xlsx?range=month");

        $response->assertStatus(200);
    }

    public function test_csv_export_blocked_for_floor_roles()
    {
        $this->actingAs($this->worker);
        $response = $this->get("/c/{$this->tenant->slug}/export-csv?range=month");

        $response->assertStatus(403);
    }

    public function test_xlsx_export_blocked_for_floor_roles()
    {
        $this->actingAs($this->worker);
        $response = $this->get("/c/{$this->tenant->slug}/export-xlsx?range=month");

        $response->assertStatus(403);
    }

    public function test_pdf_export_blocked_for_floor_roles()
    {
        $this->actingAs($this->worker);
        $response = $this->get("/c/{$this->tenant->slug}/export-pdf?range=month");

        $response->assertStatus(403);
    }
}
