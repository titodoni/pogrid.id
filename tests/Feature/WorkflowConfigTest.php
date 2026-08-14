<?php

namespace Tests\Feature;

use App\Enums\ItemStatus;
use App\Enums\PoStatus;
use App\Models\Alert;
use App\Models\Item;
use App\Models\Po;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

/**
 * Business-rule consolidation regression tests (audit 2026-08-13):
 *  - the server-owned workflow config reaches React via a shared Inertia prop
 *  - stage-role enforcement is driven by config/workflow.php (single source)
 *  - deadline-risk behavior matches the configured rule at its boundaries
 *  - one status vocabulary is shared end-to-end
 */
class WorkflowConfigTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $machiningUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'company_name' => 'Config Corp',
            'slug' => 'config-corp',
            'subscription_status' => 'active',
        ]);
        TenantManager::setTenantId($this->tenant->id);

        $machiningRole = Role::firstOrCreate(['name' => 'MACHINING'], ['level' => 'production', 'display_name' => 'Machining']);

        $this->machiningUser = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Machining Op',
            'pin' => bcrypt('1234'),
            'role_id' => $machiningRole->id,
        ]);
    }

    public function test_workflow_config_is_shared_to_client_pages(): void
    {
        $this->actingAs($this->machiningUser)
            ->get("/c/{$this->tenant->slug}")
            ->assertInertia(fn ($page) => $page
                ->has('workflow.stage_role_map')
                ->has('workflow.office_roles')
                ->has('workflow.pre_production_keywords')
                ->where('workflow.deadline.risk_days', 3)
                ->where('workflow.deadline.risk_progress', 70)
                ->where('workflow.item_statuses', array_column(ItemStatus::cases(), 'value'))
                ->where('workflow.po_statuses', array_column(PoStatus::cases(), 'value'))
            );
    }

    public function test_stage_role_enforcement_follows_config_not_hardcoded_map(): void
    {
        $po = Po::create(['po_number' => 'PO-CFG-1', 'client_name' => 'Client', 'global_deadline' => now()->addDays(5), 'status' => 'PENDING']);
        $item = Item::create(['po_id' => $po->id, 'item_name' => 'Part', 'target_qty' => 10, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'PENDING']);
        $progress = $item->itemProgresses()->where('stage_name', 'Machining')->firstOrFail();

        // Baseline: the machining operator CAN update their own stage.
        $this->actingAs($this->machiningUser)
            ->post("/c/{$this->tenant->slug}/progress/{$progress->id}/update", ['completed_qty' => 1])
            ->assertRedirect();
        $this->assertSame(1, $progress->fresh()->completed_qty);

        // Change the ONLY definition (config): machining now belongs to QC role.
        Config::set('workflow.stage_role_map', [
            ['keywords' => ['machining', 'cnc'], 'roles' => ['QC']],
        ]);

        $this->actingAs($this->machiningUser)
            ->post("/c/{$this->tenant->slug}/progress/{$progress->id}/update", ['completed_qty' => 1])
            ->assertForbidden();

        // Enforcement moved with the config — proof of a single source of truth.
        $this->assertSame(1, $progress->fresh()->completed_qty);
    }

    public function test_deadline_risk_rule_boundaries_match_config(): void
    {
        // Item A: 2 days left, 75% progress -> above threshold => NO risk alert
        $poA = Po::create(['po_number' => 'PO-CFG-A', 'client_name' => 'A', 'global_deadline' => now()->addDays(2), 'status' => 'IN_PROGRESS']);
        $itemA = Item::create(['po_id' => $poA->id, 'item_name' => 'Safe Item', 'target_qty' => 1, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'IN_PROGRESS']);
        $itemA->update(['progress_percent' => 75.00]);

        // Item B: 2 days left, 60% progress -> below threshold => YELLOW risk alert
        $poB = Po::create(['po_number' => 'PO-CFG-B', 'client_name' => 'B', 'global_deadline' => now()->addDays(2), 'status' => 'IN_PROGRESS']);
        $itemB = Item::create(['po_id' => $poB->id, 'item_name' => 'Risky Item', 'target_qty' => 1, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'IN_PROGRESS']);
        $itemB->update(['progress_percent' => 60.00]);

        // Item C: 10 days left, 60% progress -> outside window => NO risk alert
        $poC = Po::create(['po_number' => 'PO-CFG-C', 'client_name' => 'C', 'global_deadline' => now()->addDays(10), 'status' => 'IN_PROGRESS']);
        $itemC = Item::create(['po_id' => $poC->id, 'item_name' => 'Far Item', 'target_qty' => 1, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'IN_PROGRESS']);
        $itemC->update(['progress_percent' => 60.00]);

        $this->artisan('pogrid:evaluate-timelines')->assertSuccessful();

        $riskAlerts = Alert::where('severity', 'YELLOW')
            ->where('message', 'like', 'Approaching Risk:%')
            ->pluck('item_id')
            ->all();

        $this->assertNotContains($itemA->id, $riskAlerts, '75% progress inside window must NOT raise risk alert');
        $this->assertContains($itemB->id, $riskAlerts, '60% progress inside window must raise risk alert');
        $this->assertNotContains($itemC->id, $riskAlerts, '60% progress outside window must NOT raise risk alert');
    }

    public function test_deadline_thresholds_are_config_driven(): void
    {
        Config::set('workflow.deadline.risk_progress', 80);

        $po = Po::create(['po_number' => 'PO-CFG-D', 'client_name' => 'D', 'global_deadline' => now()->addDays(2), 'status' => 'IN_PROGRESS']);
        $item = Item::create(['po_id' => $po->id, 'item_name' => 'Borderline Item', 'target_qty' => 1, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'IN_PROGRESS']);
        $item->update(['progress_percent' => 75.00]);

        $this->artisan('pogrid:evaluate-timelines')->assertSuccessful();

        // With the default 70% rule this item is safe; with the configured 80% it is at risk.
        $this->assertDatabaseHas('alerts', [
            'item_id' => $item->id,
            'severity' => 'YELLOW',
            'is_resolved' => false,
        ]);
    }
}
