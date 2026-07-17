<?php

namespace Tests\Feature;

use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantStageTemplate;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * GIT-73 — Backlog feature regression tests.
 *
 * Covers recently shipped roadmap features that lacked dedicated regression
 * coverage: Performance Matrix CSV / XLSX / PDF export (GIT-51), the
 * office-only role gate on export endpoints, and tenant isolation of the
 * exported telemetry payload.
 */
class BacklogFeatureRegressionTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $owner;

    private User $worker;

    protected function setUp(): void
    {
        parent::setUp();

        TenantManager::bypass();
        $this->tenant = Tenant::create([
            'company_name' => 'Backlog Test Co',
            'slug' => 'backlog-test-co',
        ]);

        $this->owner = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Owner Sari',
            'role_id' => 8,
            'post_id' => 13,
            'is_owner' => true,
            'username' => 'owner.sari',
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

    private function seedItem(string $client, string $status = 'PENDING'): void
    {
        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-'.rand(1000, 9999),
            'client_name' => $client,
            'global_deadline' => now()->addDays(10),
            'status' => $status,
        ]);

        $item = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Bracket',
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'QC', 'Delivery'],
            'target_qty' => 3,
            'status' => 'IN_PROGRESS',
            'progress_percent' => 33,
            'invoice_status' => 'UNINVOICED',
            'payment_status' => 'UNPAID',
        ]);

        ItemProgress::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $item->id,
            'stage_name' => 'Machining',
            'status' => 'IN_PROGRESS',
            'completed_qty' => 1,
            'target_qty' => 3,
            'progress_percent' => 33,
        ]);
    }

    public function test_export_csv_requires_authentication()
    {
        // Web 'auth' middleware redirects unauthenticated requests (302) rather
        // than returning 401 for Inertia page requests.
        $response = $this->get("/c/{$this->tenant->slug}/export-csv");
        $response->assertRedirect();
    }

    public function test_export_csv_blocked_for_floor_role()
    {
        $this->actingAs($this->worker);
        $response = $this->get("/c/{$this->tenant->slug}/export-csv");
        $response->assertStatus(403);
    }

    public function test_export_csv_allowed_for_office_role_and_returns_csv()
    {
        $this->seedItem('PT Alpha');

        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}/export-csv");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $response->assertHeader('Content-Disposition', 'attachment; filename="performance-matrix-month-'.now()->format('Ymd').'.csv"');

        $content = $response->streamedContent();
        // BOM for Excel UTF-8 must be present
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        // KPI summary header + item directory headers must be present
        $this->assertStringContainsString('KPI Summary', $content);
        $this->assertStringContainsString('PO Number', $content);
        $this->assertStringContainsString('PT Alpha', $content);
    }

    public function test_export_csv_defaults_invalid_range_to_month()
    {
        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}/export-csv?range=bogus");

        $response->assertStatus(200);
        $response->assertHeader('Content-Disposition', 'attachment; filename="performance-matrix-month-'.now()->format('Ymd').'.csv"');
    }

    public function test_export_xlsx_allowed_for_office_role_and_returns_xlsx()
    {
        $this->seedItem('PT Beta');

        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}/export-xlsx");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->assertHeader('Content-Disposition', 'attachment; filename="performance-matrix-month-'.now()->format('Ymd').'.xlsx"');

        $content = $response->streamedContent();
        // Valid XLSX is a ZIP archive (PK magic bytes)
        $this->assertStringStartsWith('PK', $content);
    }

    public function test_export_pdf_allowed_for_office_role_and_returns_pdf()
    {
        $this->seedItem('PT Gamma');

        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}/export-pdf");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
        $response->assertHeader('Content-Disposition', 'attachment; filename=performance-matrix-month.pdf');
    }

    public function test_export_csv_is_tenant_isolated()
    {
        // Create a second tenant with its own data
        TenantManager::bypass();
        $tenant2 = Tenant::create([
            'company_name' => 'Other Co',
            'slug' => 'other-co',
        ]);
        $owner2 = User::create([
            'tenant_id' => $tenant2->id,
            'name' => 'Owner Lain',
            'role_id' => 8,
            'post_id' => 13,
            'is_owner' => true,
            'username' => 'owner.lain',
            'password' => bcrypt('password123'),
        ]);
        $po2 = Po::create([
            'tenant_id' => $tenant2->id,
            'po_number' => 'PO-7777',
            'client_name' => 'Secret Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);
        Item::create([
            'tenant_id' => $tenant2->id,
            'po_id' => $po2->id,
            'item_name' => 'Hidden',
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'Delivery'],
            'target_qty' => 1,
            'status' => 'IN_PROGRESS',
            'progress_percent' => 0,
        ]);
        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);

        // Authenticate as tenant1 owner and request tenant1 export
        $this->actingAs($this->owner);
        $response = $this->get("/c/{$this->tenant->slug}/export-csv");

        $response->assertStatus(200);
        $content = $response->streamedContent();
        // Tenant1 has no seeded items -> must NOT leak tenant2's client
        $this->assertStringNotContainsString('Secret Client', $content);
    }

    // ── Stage Template CRUD (backlog: template management) ──────────────────
    // The Owner Dashboard UI calls GET/POST /stage-templates and
    // /stage-templates/{id}/update|delete. These must be backed by working
    // controller actions or the Stage Template Manager panel 500s.

    public function test_stage_templates_list_returns_ok_for_owner()
    {
        $this->actingAs($this->owner);
        $response = $this->get('/stage-templates');
        $response->assertStatus(200);
    }

    public function test_stage_template_create_persists_record()
    {
        $this->actingAs($this->owner);
        $response = $this->post('/stage-templates', [
            'name' => 'Standard CNC Flow',
            'description' => 'Machining then QC then delivery',
            'stages' => ['Machining', 'QC', 'Delivery'],
        ]);

        $this->assertContains($response->getStatusCode(), [200, 201, 302]);
        $this->assertDatabaseHas('tenant_stage_templates', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Standard CNC Flow',
        ]);
    }

    public function test_stage_template_update_and_delete()
    {
        $this->actingAs($this->owner);

        $template = TenantStageTemplate::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Old Name',
            'description' => 'old',
            'stages' => ['Machining', 'QC'],
            'sort_order' => 0,
        ]);

        $update = $this->post("/stage-templates/{$template->id}/update", [
            'name' => 'New Name',
            'description' => 'new',
            'stages' => ['Design', 'Machining', 'QC', 'Delivery'],
        ]);
        $this->assertContains($update->getStatusCode(), [200, 201, 302]);
        $this->assertDatabaseHas('tenant_stage_templates', [
            'id' => $template->id,
            'name' => 'New Name',
        ]);

        $delete = $this->post("/stage-templates/{$template->id}/delete");
        $this->assertContains($delete->getStatusCode(), [200, 201, 302]);
        $this->assertDatabaseMissing('tenant_stage_templates', [
            'id' => $template->id,
        ]);
    }

    public function test_stage_templates_are_tenant_isolated()
    {
        TenantManager::bypass();
        $tenant2 = Tenant::create([
            'company_name' => 'Other Tmpl Co',
            'slug' => 'other-tmpl-co',
        ]);
        TenantStageTemplate::create([
            'tenant_id' => $tenant2->id,
            'name' => 'Foreign Template',
            'description' => 'should not be visible',
            'stages' => ['QC'],
            'sort_order' => 0,
        ]);
        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($this->owner);
        $response = $this->get('/stage-templates');
        $response->assertStatus(200);
        $this->assertStringNotContainsString('Foreign Template', $response->getContent());
    }

    public function test_worker_my_kpi_returns_completed_stages()
    {
        TenantManager::bypass();
        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-KPI-1',
            'client_name' => 'KPI Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'COMPLETED',
        ]);
        $item = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'KPI Bracket',
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'target_qty' => 5,
            'status' => 'COMPLETED',
            'progress_percent' => 100,
        ]);
        $progress = ItemProgress::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $item->id,
            'stage_name' => 'Machining',
            'status' => 'COMPLETED',
            'completed_qty' => 5,
            'target_qty' => 5,
            'progress_percent' => 100,
        ]);
        // created_at/updated_at are not fillable on ItemProgress, so set them
        // directly to exercise the cycle-time math in myKpi().
        $progress->created_at = now()->subDays(5)->startOfDay();
        $progress->updated_at = now()->startOfDay();
        $progress->save();
        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($this->worker);
        $response = $this->get("/c/{$this->tenant->slug}/my-kpi");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Worker/MyKpi')
            ->has('completed_stages', 1)
            ->has('summary')
            ->has('stage_breakdown')
            ->has('monthly_trend')
            ->where('summary.total_completed', 1)
            ->where('summary.avg_cycle_days', 5)
        );
    }

    /**
     * GIT-73 — myKpi role filtering: a DRAFTER worker must only see completed
     * stages whose name matches drafter keywords (design/gambar/draft) and must
     * NOT see machining/fabrication stages. This guards the STAGE_ROLE_MAP filter
     * in WorkerDashboardController::myKpi.
     */
    public function test_worker_my_kpi_filters_completed_stages_by_role()
    {
        TenantManager::bypass();

        $drafterRole = Role::where('name', 'DRAFTER')->firstOrFail();

        $drafter = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Drafter Ari',
            'role_id' => $drafterRole->id,
            'post_id' => 1,
            'pin' => bcrypt('1234'),
        ]);

        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-KPI-ROLE',
            'client_name' => 'Role Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'COMPLETED',
        ]);

        $itemDesign = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Design Part',
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Design', 'Machining'],
            'target_qty' => 4,
            'status' => 'COMPLETED',
            'progress_percent' => 100,
        ]);

        // A drafter-completed stage (matches DRAFTER keyword "design")
        $designProgress = ItemProgress::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $itemDesign->id,
            'stage_name' => 'Design',
            'status' => 'COMPLETED',
            'completed_qty' => 4,
            'target_qty' => 4,
            'progress_percent' => 100,
        ]);
        $designProgress->created_at = now()->subDays(4)->startOfDay();
        $designProgress->updated_at = now()->startOfDay();
        $designProgress->save();

        // A machining-completed stage that a drafter must NOT see
        $machiningProgress = ItemProgress::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $itemDesign->id,
            'stage_name' => 'Machining',
            'status' => 'COMPLETED',
            'completed_qty' => 4,
            'target_qty' => 4,
            'progress_percent' => 100,
        ]);
        $machiningProgress->created_at = now()->subDays(3)->startOfDay();
        $machiningProgress->updated_at = now()->startOfDay();
        $machiningProgress->save();

        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($drafter);
        $response = $this->get("/c/{$this->tenant->slug}/my-kpi");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Worker/MyKpi')
            ->has('completed_stages', 1)
            ->where('summary.total_completed', 1)
            ->where('completed_stages.0.stage_name', 'Design')
        );
    }

    /**
     * GIT-73 — myKpi tenant isolation: a worker from a different tenant must be
     * rejected with 403, never see another tenant's completed stages.
     */
    public function test_worker_my_kpi_blocks_cross_tenant_worker()
    {
        TenantManager::bypass();
        $otherTenant = Tenant::create([
            'company_name' => 'Rival Co',
            'slug' => 'rival-co',
        ]);
        $intruder = User::create([
            'tenant_id' => $otherTenant->id,
            'name' => 'Intruder',
            'role_id' => 5,
            'post_id' => 7,
            'pin' => bcrypt('1234'),
        ]);
        TenantManager::enableScope();
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($intruder);
        $response = $this->get("/c/{$this->tenant->slug}/my-kpi");

        $response->assertStatus(403);
    }
}
