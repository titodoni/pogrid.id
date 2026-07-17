<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\Item;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PpicDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $ppicUser;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'company_name' => 'Teknik Mandiri',
            'slug' => 'teknik-mandiri',
            'subscription_status' => 'active',
        ]);

        TenantManager::setTenantId($this->tenant->id);

        // Seed roles from migration
        if (DB::table('roles')->count() === 0) {
            $roles = [
                ['name' => 'DRAFTER', 'display_name' => 'Drafter', 'level' => 'production'],
                ['name' => 'PURCHASING', 'display_name' => 'Purchasing', 'level' => 'production'],
                ['name' => 'MACHINING', 'display_name' => 'Operator', 'level' => 'production'],
                ['name' => 'FABRICATION', 'display_name' => 'Fabrication', 'level' => 'production'],
                ['name' => 'PRODUCTION', 'display_name' => 'Helper', 'level' => 'production'],
                ['name' => 'QC', 'display_name' => 'QC Inspector', 'level' => 'production'],
                ['name' => 'DELIVERY', 'display_name' => 'Delivery', 'level' => 'production'],
                ['name' => 'STAFF', 'display_name' => 'Staff', 'level' => 'office'],
                ['name' => 'PPIC', 'display_name' => 'PPIC', 'level' => 'production'],
            ];
            foreach ($roles as $role) {
                DB::table('roles')->updateOrInsert(['name' => $role['name']], $role);
            }
        }

        $ppicRoleId = DB::table('roles')->where('name', 'PPIC')->value('id');

        $this->ppicUser = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Bambang PPIC',
            'pin' => bcrypt('1234'),
            'role_id' => $ppicRoleId,
        ]);

        $staffRoleId = DB::table('roles')->where('name', 'STAFF')->value('id');

        $this->adminUser = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Admin User',
            'username' => 'admin',
            'password' => bcrypt('password'),
            'role_id' => $staffRoleId,
            'is_owner' => true,
        ]);
    }

    public function test_ppic_user_gets_ppic_dashboard_instead_of_floor_view()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client Alpha',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Bracket X',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Material', 'Machining', 'QC'],
            'status' => 'PENDING',
        ]);

        $response = $this->actingAs($this->ppicUser)
            ->get("/c/{$this->tenant->slug}");

        $response->assertStatus(200);

        // Verify the response contains PPIC-specific data
        $response->assertInertia(fn ($page) => $page
            ->component('Ppic/Dashboard')
            ->has('schedule', 1)
            ->has('work_center_load')
            ->has('material_readiness')
            ->has('bottlenecks')
            ->has('delivery_forecast')
            ->has('capacity_view')
            ->where('schedule.0.po_number', 'PO-1001')
            ->where('schedule.0.client_name', 'Client Alpha')
            ->where('schedule.0.items.0.item_name', 'Bracket X')
        );
    }

    public function test_ppic_dashboard_schedule_shows_production_schedule()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po1 = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client Alpha',
            'global_deadline' => now()->addDays(3),
            'status' => 'PENDING',
        ]);

        $item1 = Item::create([
            'po_id' => $po1->id,
            'item_name' => 'Gearbox',
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Design', 'Material', 'Machining', 'QC'],
            'status' => 'PENDING',
        ]);

        $po2 = Po::create([
            'po_number' => 'PO-1002',
            'client_name' => 'Client Beta',
            'global_deadline' => now()->addDays(20),
            'status' => 'IN_PROGRESS',
        ]);

        $response = $this->actingAs($this->ppicUser)
            ->get("/c/{$this->tenant->slug}");

        $response->assertInertia(fn ($page) => $page
            ->component('Ppic/Dashboard')
            ->has('schedule', 2)
            ->where('schedule.0.po_number', 'PO-1001')
            ->where('schedule.1.po_number', 'PO-1002')
        );
    }

    public function test_ppic_dashboard_work_center_load_counts_progress()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client Alpha',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Bracket X',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Material', 'Machining', 'QC'],
            'status' => 'PENDING',
        ]);

        // Complete Material, start Machining
        $materialStage = $item->itemProgresses()->where('stage_name', 'Material')->first();
        $materialStage->update(['completed_qty' => 10, 'status' => 'COMPLETED']);

        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();
        $machiningStage->update(['completed_qty' => 3, 'status' => 'IN_PROGRESS']);

        $response = $this->actingAs($this->ppicUser)
            ->get("/c/{$this->tenant->slug}");

        $response->assertInertia(fn ($page) => $page
            ->component('Ppic/Dashboard')
            ->has('work_center_load')
        );
    }

    public function test_ppic_dashboard_bottlenecks_detects_stuck_items()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client Alpha',
            'global_deadline' => now()->addDays(5),
            'status' => 'IN_PROGRESS',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Flange D',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'QC'],
            'status' => 'IN_PROGRESS',
        ]);

        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();
        $machiningStage->update(['status' => 'STUCK']);

        Alert::create([
            'item_id' => $item->id,
            'severity' => 'RED',
            'reason_type' => 'Machine Broken',
            'message' => "Stuck: Machine Broken on stage 'Machining' for item 'Flange D' (PO: PO-1001).",
            'is_resolved' => false,
        ]);

        $response = $this->actingAs($this->ppicUser)
            ->get("/c/{$this->tenant->slug}");

        $response->assertInertia(fn ($page) => $page
            ->component('Ppic/Dashboard')
            ->has('bottlenecks')
        );
    }

    public function test_ppic_dashboard_material_readiness_tracks_ready_status()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-1001',
            'client_name' => 'Client Alpha',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Shaft S45C',
            'target_qty' => 20,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Material', 'Machining'],
            'status' => 'PENDING',
        ]);

        $materialStage = $item->itemProgresses()->where('stage_name', 'Material')->first();
        $materialStage->update(['completed_qty' => 20, 'status' => 'COMPLETED']);

        $response = $this->actingAs($this->ppicUser)
            ->get("/c/{$this->tenant->slug}");

        $response->assertInertia(fn ($page) => $page
            ->component('Ppic/Dashboard')
            ->has('material_readiness.ready')
        );
    }

    public function test_non_ppic_user_gets_regular_dashboard()
    {
        TenantManager::setTenantId($this->tenant->id);

        $response = $this->actingAs($this->adminUser)
            ->get("/c/{$this->tenant->slug}");

        // Admin/owner should still get office dashboard, not PPIC
        $response->assertInertia(fn ($page) => $page
            ->component('Owner/Dashboard')
        );
    }

    public function test_overdue_items_appear_in_delivery_forecast()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-OVERDUE',
            'client_name' => 'Client Overdue',
            'global_deadline' => now()->subDays(5),
            'status' => 'IN_PROGRESS',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Overdue Part',
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'IN_PROGRESS',
        ]);

        $response = $this->actingAs($this->ppicUser)
            ->get("/c/{$this->tenant->slug}");

        $response->assertInertia(fn ($page) => $page
            ->component('Ppic/Dashboard')
            ->has('delivery_forecast.overdue', 1)
            ->where('delivery_forecast.overdue_count', 1)
        );
    }
}
