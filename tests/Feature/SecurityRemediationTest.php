<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\Item;
use App\Models\Po;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Regression tests for the P0 security remediation:
 *  A. Email verification is a real gate (MustVerifyEmail, no testing bypass)
 *  B. Authorization enforced on office group + PPIC/PIN-reset mutations
 *  C. PINs are never persisted in alert messages
 *  D. Authentication endpoints are throttled
 */
class SecurityRemediationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Role $officeRole;

    protected Role $workerRole;

    protected Role $salesRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'company_name' => 'Security Corp',
            'slug' => 'security-corp',
            'subscription_status' => 'active',
        ]);

        $this->officeRole = Role::firstOrCreate(['name' => 'STAFF'], ['level' => 'office', 'display_name' => 'Staff']);
        $this->workerRole = Role::firstOrCreate(['name' => 'MACHINING'], ['level' => 'production', 'display_name' => 'Machining']);
        $this->salesRole = Role::firstOrCreate(['name' => 'SALES'], ['level' => 'office', 'display_name' => 'Sales']);
    }

    private function makeOfficeUser(array $overrides = []): User
    {
        TenantManager::setTenantId($this->tenant->id);

        return User::create(array_merge([
            'tenant_id' => $this->tenant->id,
            'name' => 'Office User',
            'username' => 'office_'.fake()->unique()->numberBetween(1000, 99999),
            'email' => fake()->unique()->safeEmail(),
            'password' => bcrypt('password123'),
            'role_id' => $this->officeRole->id,
            'email_verified_at' => now(),
        ], $overrides));
    }

    private function makeWorker(array $overrides = []): User
    {
        TenantManager::setTenantId($this->tenant->id);

        return User::create(array_merge([
            'tenant_id' => $this->tenant->id,
            'name' => 'Floor Worker',
            'pin' => bcrypt('1234'),
            'role_id' => $this->workerRole->id,
        ], $overrides));
    }

    // ---------------------------------------------------------------
    // A. Email verification
    // ---------------------------------------------------------------

    public function test_verified_office_user_can_access_office_routes(): void
    {
        $user = $this->makeOfficeUser();

        $this->actingAs($user)->get('/logs')->assertOk();
    }

    public function test_unverified_user_is_redirected_from_office_routes_even_in_testing(): void
    {
        // Running in APP_ENV=testing — the old middleware bypassed verification
        // here. This test proving a redirect in this same environment proves
        // the bypass is gone.
        $this->assertTrue(app()->environment('testing'));

        $user = $this->makeOfficeUser(['email_verified_at' => null]);

        $response = $this->actingAs($user)->get('/logs');

        $response->assertRedirect(route('verification.notice'));
        $this->assertFalse($user->hasVerifiedEmail());
    }

    public function test_unverified_user_can_verify_via_signed_link_and_then_access_office_routes(): void
    {
        $user = $this->makeOfficeUser(['email_verified_at' => null]);

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $this->actingAs($user)->get($url)
            ->assertRedirect('/selamat-datang');

        $this->assertNotNull($user->fresh()->email_verified_at);

        $this->actingAs($user)->get('/logs')->assertOk();
    }

    // ---------------------------------------------------------------
    // B. Authorization boundaries
    // ---------------------------------------------------------------

    public function test_floor_worker_is_forbidden_from_office_route_group(): void
    {
        $worker = $this->makeWorker();

        $this->actingAs($worker)->get('/dashboard')->assertForbidden();
        $this->actingAs($worker)->get('/logs')->assertForbidden();
        $this->actingAs($worker)->post('/users/1/delete')->assertForbidden();
    }

    public function test_floor_worker_cannot_call_ppic_mutations(): void
    {
        TenantManager::setTenantId($this->tenant->id);
        $po = Po::create(['po_number' => 'PO-SEC-1', 'client_name' => 'Client', 'global_deadline' => now()->addDays(7), 'status' => 'PENDING']);
        $item = Item::create(['po_id' => $po->id, 'item_name' => 'Part', 'target_qty' => 1, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'PENDING']);

        $worker = $this->makeWorker();

        $this->actingAs($worker)
            ->post("/c/{$this->tenant->slug}/ppic/pos/{$po->id}/update", [
                'global_deadline' => now()->addDays(30)->toDateString(),
                'is_urgent' => true,
            ])
            ->assertForbidden();

        $this->actingAs($worker)
            ->post("/c/{$this->tenant->slug}/ppic/items/{$item->id}/priority", ['is_urgent' => true])
            ->assertForbidden();

        $this->assertFalse($po->fresh()->is_urgent);
        $this->assertFalse((bool) $item->fresh()->is_urgent);
    }

    public function test_cross_tenant_ppic_mutation_is_forbidden(): void
    {
        $tenantB = Tenant::create(['company_name' => 'Other Corp', 'slug' => 'other-corp', 'subscription_status' => 'active']);

        TenantManager::setTenantId($tenantB->id);
        $poB = Po::create(['po_number' => 'PO-SEC-B', 'client_name' => 'Client B', 'global_deadline' => now()->addDays(7), 'status' => 'PENDING']);

        // Owner of tenant A attempts to mutate tenant B's PO via tenant B's slug
        $ownerA = $this->makeOfficeUser(['is_owner' => true, 'name' => 'Owner A']);

        $this->actingAs($ownerA)
            ->post("/c/{$tenantB->slug}/ppic/pos/{$poB->id}/update", [
                'global_deadline' => now()->addDays(30)->toDateString(),
                'is_urgent' => true,
            ])
            ->assertForbidden();

        $this->assertFalse($poB->fresh()->is_urgent);
    }

    public function test_ppic_user_can_call_ppic_mutations(): void
    {
        $ppicRole = Role::firstOrCreate(['name' => 'PPIC'], ['level' => 'production', 'display_name' => 'PPIC']);
        $ppic = $this->makeWorker(['name' => 'PPIC User', 'role_id' => $ppicRole->id, 'pin' => bcrypt('9999')]);

        TenantManager::setTenantId($this->tenant->id);
        $po = Po::create(['po_number' => 'PO-SEC-2', 'client_name' => 'Client', 'global_deadline' => now()->addDays(7), 'status' => 'PENDING']);
        $item = Item::create(['po_id' => $po->id, 'item_name' => 'Part 2', 'target_qty' => 1, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'PENDING']);

        $newDeadline = now()->addDays(30)->toDateString();

        $this->actingAs($ppic)
            ->post("/c/{$this->tenant->slug}/ppic/pos/{$po->id}/update", [
                'global_deadline' => $newDeadline,
                'is_urgent' => true,
            ])
            ->assertRedirect();

        $this->actingAs($ppic)
            ->post("/c/{$this->tenant->slug}/ppic/items/{$item->id}/priority", ['is_urgent' => true])
            ->assertRedirect();

        $this->assertTrue($po->fresh()->is_urgent);
        $this->assertTrue((bool) $item->fresh()->is_urgent);
    }

    public function test_non_admin_office_user_cannot_approve_pin_reset(): void
    {
        TenantManager::setTenantId($this->tenant->id);
        $po = Po::create(['po_number' => 'PO-SEC-3', 'client_name' => 'Client', 'global_deadline' => now()->addDays(7), 'status' => 'PENDING']);
        $item = Item::create(['po_id' => $po->id, 'item_name' => 'Part 3', 'target_qty' => 1, 'item_type' => 'MANUFACTURE', 'required_stages' => ['Machining'], 'status' => 'PENDING']);
        $worker = $this->makeWorker();

        $alert = Alert::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $item->id,
            'severity' => 'BLUE',
            'message' => "PIN Reset Requested for {$worker->name} (ID:{$worker->id}) by worker.",
            'is_resolved' => false,
        ]);

        $sales = $this->makeOfficeUser(['name' => 'Sales User', 'role_id' => $this->salesRole->id]);

        $this->actingAs($sales)
            ->post("/pin-reset/{$alert->id}/approve")
            ->assertForbidden();

        $this->assertFalse($alert->fresh()->is_resolved);
    }

    // ---------------------------------------------------------------
    // C. PIN secrecy on reset approval
    // ---------------------------------------------------------------

    public function test_pin_reset_happy_path_and_pin_never_persisted(): void
    {
        $worker = $this->makeWorker();
        $owner = $this->makeOfficeUser(['is_owner' => true, 'name' => 'Owner', 'username' => 'owner_sec']);

        // 1. Worker (guest) requests PIN reset
        $this->post("/c/{$this->tenant->slug}/pin-reset/request", ['user_id' => $worker->id])
            ->assertRedirect();

        $this->assertTrue($worker->fresh()->pin_reset_requested);

        $alert = Alert::where('tenant_id', $this->tenant->id)
            ->where('severity', 'BLUE')
            ->where('is_resolved', false)
            ->latest('id')
            ->first();
        $this->assertNotNull($alert);

        // 2. Owner approves — new PIN shown once in flash, never persisted
        $response = $this->actingAs($owner)->post("/pin-reset/{$alert->id}/approve");
        $response->assertRedirect();

        $alert->refresh();
        $this->assertTrue($alert->is_resolved);
        $this->assertSame("PIN Reset Approved for {$worker->name}.", $alert->message);
        $this->assertDoesNotMatchRegularExpression('/\d{4}/', $alert->message);

        $flash = session('success');
        $this->assertMatchesRegularExpression('/New PIN for .*: (\d{4})/', $flash);
        preg_match('/(\d{4})/', $flash, $m);
        $newPin = $m[1];

        // 3. New PIN works on the floor login; old PIN does not
        $this->post("/c/{$this->tenant->slug}/login", ['user_id' => $worker->id, 'pin' => $newPin])
            ->assertRedirect("/c/{$this->tenant->slug}");

        auth()->logout();

        $this->post("/c/{$this->tenant->slug}/login", ['user_id' => $worker->id, 'pin' => '1234'])
            ->assertSessionHasErrors(['pin' => 'pin_incorrect']);
    }

    // ---------------------------------------------------------------
    // D. Authentication throttling
    // ---------------------------------------------------------------

    public function test_office_login_is_throttled(): void
    {
        $this->makeOfficeUser(['username' => 'throttle_me', 'email' => 'throttle@test.com']);

        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', ['username' => 'throttle_me', 'password' => 'wrong'])->assertStatus(302);
        }

        $this->post('/login', ['username' => 'throttle_me', 'password' => 'wrong'])
            ->assertStatus(429);
    }

    public function test_throttled_inertia_request_gets_localized_error_key(): void
    {
        $this->makeOfficeUser(['username' => 'throttle_inertia', 'email' => 'throttle2@test.com']);

        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', ['username' => 'throttle_inertia', 'password' => 'wrong']);
        }

        $this->from('/login')
            ->withHeader('X-Inertia', 'true')
            ->post('/login', ['username' => 'throttle_inertia', 'password' => 'wrong'])
            ->assertSessionHasErrors(['username' => 'too_many_attempts']);
    }

    public function test_registration_is_throttled(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->post('/register', [])->assertStatus(302);
        }

        $this->post('/register', [])->assertStatus(429);
    }

    public function test_forgot_password_is_throttled(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $this->post('/forgot-password', ['email' => 'nobody@example.com'])->assertStatus(302);
        }

        $this->post('/forgot-password', ['email' => 'nobody@example.com'])->assertStatus(429);
    }

    public function test_forgot_password_sends_reset_notification_via_explicit_tenant_bypass(): void
    {
        \Illuminate\Support\Facades\Notification::fake();

        $user = $this->makeOfficeUser(['email' => 'reset-me@test.com']);

        $this->post('/forgot-password', ['email' => 'reset-me@test.com'])
            ->assertSessionHas('success');

        \Illuminate\Support\Facades\Notification::assertSentTo(
            $user,
            \App\Notifications\ResetPasswordNotification::class
        );
    }
}
