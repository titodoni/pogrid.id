<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Alert;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Post;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProjectLogsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $office;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'company_name' => 'Log Co',
            'slug' => 'log-co',
        ]);

        $role = Role::firstOrCreate(['name' => 'STAFF'], ['level' => 'office', 'display_name' => 'Office Staff']);
        $post = Post::firstOrCreate(['name' => 'Admin'], ['display_name' => 'System Administrator']);

        $this->office = User::create([
            'email_verified_at' => now(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Log Officer',
            'username' => 'log_officer',
            'password' => Hash::make('password'),
            'role_id' => $role->id,
            'post_id' => $post->id,
            'is_owner' => false,
        ]);
    }

    public function test_logs_are_written_for_po_item_progress_and_alert_actions(): void
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-LOG-1',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(7),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'tenant_id' => $this->tenant->id,
            'po_id' => $po->id,
            'item_name' => 'Bracket',
            'item_type' => 'MANUFACTURE',
            'target_qty' => 10,
            'required_stages' => ['Machining', 'QC'],
            'status' => 'PENDING',
        ]);

        // Worker logs progress on the Machining stage (a real delta).
        $progress = ItemProgress::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $item->id,
            'stage_name' => 'Machining',
            'completed_qty' => 0,
            'progress_percent' => 0.00,
            'status' => 'PENDING',
        ]);
        $progress->update(['completed_qty' => 5, 'progress_percent' => 50.00]);

        Alert::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $item->id,
            'user_id' => $this->office->id,
            'severity' => 'YELLOW',
            'reason_type' => 'QC Rework',
            'message' => "QC Rework: 2 items rejected on stage 'Machining' for item 'Bracket'.",
        ]);

        $actions = ActivityLog::all()->pluck('action')->values()->all();

        // Item/progress/alert logging is driven by model observers (auto).
        $this->assertContains('item_created', $actions, 'Item creation should be logged');
        $this->assertContains('progress_logged', $actions, 'Progress updates should be logged');
        $this->assertContains('alert_created', $actions, 'Alert creation should be logged');
    }

    public function test_logs_page_renders_for_office_user(): void
    {
        TenantManager::setTenantId($this->tenant->id);
        ActivityLog::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->office->id,
            'action' => 'progress_logged',
            'description' => 'Progress Machining — 5 pcs, 50%',
        ]);

        $this->actingAs($this->office);

        $response = $this->get('/logs');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Owner/Logs')
            ->has('logs.data', 1)
            ->has('projects')
            ->where('selected_project', null));
    }

    public function test_logs_page_filters_by_project(): void
    {
        TenantManager::setTenantId($this->tenant->id);

        $poA = Po::create(['tenant_id' => $this->tenant->id, 'po_number' => 'PO-LOG-A', 'client_name' => 'A', 'global_deadline' => now()->addWeek()]);
        $poB = Po::create(['tenant_id' => $this->tenant->id, 'po_number' => 'PO-LOG-B', 'client_name' => 'B', 'global_deadline' => now()->addWeek()]);

        ActivityLog::create([
            'tenant_id' => $this->tenant->id,
            'project_id' => $poA->id,
            'action' => 'project_created',
            'description' => 'A',
        ]);
        ActivityLog::create([
            'tenant_id' => $this->tenant->id,
            'project_id' => $poB->id,
            'action' => 'project_created',
            'description' => 'B',
        ]);

        $this->actingAs($this->office);

        $response = $this->get("/logs?project_id={$poA->id}");
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Owner/Logs')
            ->where('selected_project', $poA->id)
            ->has('logs.data', 1)
            ->has('logs.total'));
    }
}
