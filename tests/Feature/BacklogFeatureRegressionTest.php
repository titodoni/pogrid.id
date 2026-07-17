<?php

namespace Tests\Feature;

use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Tenant;
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
}
