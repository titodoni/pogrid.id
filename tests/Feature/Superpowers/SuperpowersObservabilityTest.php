<?php

namespace Tests\Feature\Superpowers;

use App\Models\EmailLog;
use App\Models\Item;
use App\Models\Plan;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

/**
 * Observability surfaces: dashboard KPIs, email delivery log, error log,
 * and system health.
 */
class SuperpowersObservabilityTest extends SuperpowersTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsPlatformAdmin();
    }

    public function test_dashboard_aggregates_platform_wide_counts_and_mrr(): void
    {
        $premium = Plan::create(['name' => 'Premium', 'price' => 25_000_00]);

        $alpha = $this->makeTenant([
            'company_name' => 'Alpha Co',
            'slug' => 'alpha-co',
            'plan_id' => $premium->id,
        ]);
        $this->makeTenant([
            'company_name' => 'Lapsed Co',
            'slug' => 'lapsed-co',
            'plan_id' => $premium->id,
            'subscription_status' => Tenant::STATUS_READONLY,
        ]);
        $gone = $this->makeTenant(['company_name' => 'Gone Co', 'slug' => 'gone-co']);
        TenantManager::runWithoutScope(fn () => $gone->delete());

        TenantManager::runWithoutScope(function () use ($alpha) {
            User::create([
                'tenant_id' => $alpha->id,
                'name' => 'Sari Dewi',
                'email' => 'sari@alpha.test',
                'email_verified_at' => now(),
                'password' => Hash::make('poiuy'),
                'role_id' => 8,
                'post_id' => 12,
            ]);

            $po = Po::create([
                'tenant_id' => $alpha->id,
                'po_number' => 'PO-1',
                'client_name' => 'Client',
                'global_deadline' => now()->addDays(5),
                'status' => 'PENDING',
            ]);

            Item::create([
                'tenant_id' => $alpha->id,
                'po_id' => $po->id,
                'item_name' => 'Part A',
                'target_qty' => 1,
                'item_type' => 'MANUFACTURE',
                'required_stages' => ['Machining'],
                'status' => 'PENDING',
            ]);
        });

        $this->get('/superpowers')->assertInertia(fn ($page) => $page
            ->component('Superpowers/Dashboard')
            ->where('stats.tenants_total', 3)
            ->where('stats.tenants_active', 1)
            ->where('stats.tenants_readonly', 1)
            ->where('stats.tenants_deleted', 1)
            ->where('stats.users_total', 1)
            ->where('stats.pos_total', 1)
            ->where('stats.items_total', 1)
            ->where('stats.mrr_cents', 25_000_00)
        );
    }

    public function test_dashboard_shows_recent_superadmin_activity(): void
    {
        $this->post('/superpowers/settings/maintenance', ['enabled' => true]);

        $this->get('/superpowers')->assertInertia(fn ($page) => $page
            ->has('recent_activity', 1)
            ->where('recent_activity.0.action', 'maintenance.toggled')
            ->where('recent_activity.0.admin_name', 'Platform Dev')
        );
    }

    public function test_email_log_captures_a_sent_message_across_tenants(): void
    {
        $tenant = $this->makeTenant();

        $user = TenantManager::runWithoutScope(fn () => User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Sari Dewi',
            'email' => 'sari@teknik.test',
            'password' => Hash::make('poiuy'),
            'role_id' => 8,
            'post_id' => 12,
        ]));

        TenantManager::setTenantId($tenant->id);
        $user->sendEmailVerificationNotification();
        TenantManager::setTenantId(null);

        $log = TenantManager::runWithoutScope(fn () => EmailLog::latest('id')->first());

        $this->assertNotNull($log);
        $this->assertSame(EmailLog::STATUS_SENT, $log->status);
        $this->assertSame('sari@teknik.test', $log->to);
        $this->assertSame($tenant->id, $log->tenant_id);
        $this->assertNotNull($log->sent_at);
        $this->assertNotNull($log->message_id);

        $this->get('/superpowers/emails')->assertInertia(fn ($page) => $page
            ->component('Superpowers/Emails/Index')
            ->has('logs.data', 1)
            ->where('logs.data.0.tenant_name', 'Teknik Mandiri')
            ->where('stats.sent', 1)
        );
    }

    public function test_email_log_status_and_search_filters(): void
    {
        TenantManager::runWithoutScope(function () {
            EmailLog::create([
                'to' => 'a@example.test',
                'subject' => 'Reset kata sandi',
                'status' => EmailLog::STATUS_SENT,
                'sent_at' => now(),
            ]);
            EmailLog::create([
                'to' => 'b@example.test',
                'subject' => 'Undangan tim',
                'status' => EmailLog::STATUS_FAILED,
                'error' => 'mailbox full',
            ]);
        });

        $this->get('/superpowers/emails?status=failed')->assertInertia(fn ($page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.to', 'b@example.test')
        );

        $this->get('/superpowers/emails?search=Reset')->assertInertia(fn ($page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.to', 'a@example.test')
        );
    }

    public function test_error_log_page_parses_entries_and_counts_errors(): void
    {
        $path = storage_path('logs/laravel.log');
        $original = file_exists($path) ? file_get_contents($path) : null;

        file_put_contents($path, implode("\n", [
            '[2026-08-15 09:00:00] testing.ERROR: Ledakan pertama',
            '[2026-08-15 09:01:00] testing.INFO: Semua baik',
            '[2026-08-15 09:02:00] testing.ERROR: Ledakan kedua',
            '',
        ]));

        try {
            $this->get('/superpowers/logs')->assertInertia(fn ($page) => $page
                ->component('Superpowers/Logs/Index')
                ->where('log_exists', true)
                ->where('error_count', 2)
                ->has('entries', 3)
                // Newest first.
                ->where('entries.0.level', 'ERROR')
                ->where('entries.0.message', 'Ledakan kedua')
            );
        } finally {
            $original === null
                ? @unlink($path)
                : file_put_contents($path, $original);
        }
    }

    public function test_error_log_line_window_is_clamped(): void
    {
        $this->get('/superpowers/logs?lines=999999')->assertInertia(
            fn ($page) => $page->where('lines', 2000)
        );

        $this->get('/superpowers/logs?lines=1')->assertInertia(
            fn ($page) => $page->where('lines', 50)
        );
    }

    public function test_health_page_reports_checks_and_disk_usage(): void
    {
        $this->get('/superpowers/health')->assertInertia(fn ($page) => $page
            ->component('Superpowers/Health/Index')
            ->where('checks.database.healthy', true)
            ->where('checks.cache.healthy', true)
            ->where('checks.storage.healthy', true)
            ->has('disk.used_percent')
            ->has('backups')
        );
    }

    public function test_backup_trigger_is_audited(): void
    {
        Notification::fake();

        $this->post('/superpowers/health/backup')->assertRedirect();

        $this->assertDatabaseHas('platform_activity_logs', [
            'action' => 'backup.triggered',
        ]);
    }

    public function test_observability_pages_require_a_platform_session(): void
    {
        $this->flushSession();
        auth('platform')->logout();

        foreach (['/superpowers', '/superpowers/emails', '/superpowers/logs', '/superpowers/health'] as $url) {
            $this->get($url)->assertRedirect('/superpowers/login');
        }
    }
}
