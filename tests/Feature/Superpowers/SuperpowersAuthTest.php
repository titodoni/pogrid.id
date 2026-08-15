<?php

namespace Tests\Feature\Superpowers;

use App\Models\PlatformActivityLog;
use App\Models\PlatformAdmin;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;

class SuperpowersAuthTest extends SuperpowersTestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_platform_login(): void
    {
        $this->get('/superpowers')->assertRedirect('/superpowers/login');
    }

    public function test_tenant_user_session_does_not_grant_platform_access(): void
    {
        $tenant = $this->makeTenant();

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Sari Dewi',
            'email' => 'sari@teknik.test',
            'email_verified_at' => now(),
            'password' => Hash::make('poiuy'),
            'role_id' => 8,
            'post_id' => 12,
            'is_owner' => true,
        ]);

        // Authenticated on the default (tenant) guard only — the platform guard
        // must remain unauthenticated.
        $this->actingAs($user)
            ->get('/superpowers')
            ->assertRedirect('/superpowers/login');
    }

    public function test_login_without_two_factor_reaches_dashboard_and_is_audited(): void
    {
        $admin = $this->createAdmin();

        $this->post('/superpowers/login', [
            'email' => $admin->email,
            'password' => 'platform-secret',
        ])->assertRedirect('/superpowers');

        $this->assertAuthenticatedAs($admin, 'platform');
        $this->assertSame($admin->id, session('platform.2fa.verified'));
        $this->assertDatabaseHas('platform_activity_logs', [
            'platform_admin_id' => $admin->id,
            'action' => 'login',
        ]);
        $this->assertNotNull($admin->fresh()->last_login_at);
    }

    public function test_wrong_password_is_rejected(): void
    {
        $admin = $this->createAdmin();

        $this->from('/superpowers/login')
            ->post('/superpowers/login', [
                'email' => $admin->email,
                'password' => 'wrong-password',
            ])
            ->assertSessionHasErrors('email');

        $this->assertGuest('platform');
    }

    public function test_inactive_admin_cannot_log_in(): void
    {
        $admin = $this->createAdmin(['is_active' => false]);

        $this->from('/superpowers/login')
            ->post('/superpowers/login', [
                'email' => $admin->email,
                'password' => 'platform-secret',
            ])
            ->assertSessionHasErrors('email');

        $this->assertGuest('platform');
    }

    public function test_admin_deactivated_mid_session_is_logged_out(): void
    {
        $admin = $this->actingAsPlatformAdmin();

        $admin->forceFill(['is_active' => false])->save();

        $this->get('/superpowers')->assertRedirect('/superpowers/login');
        $this->assertGuest('platform');
    }

    public function test_admin_with_two_factor_is_held_at_challenge(): void
    {
        [$admin, $secret] = $this->createAdminWithTotp();

        $this->post('/superpowers/login', [
            'email' => $admin->email,
            'password' => 'platform-secret',
        ])->assertRedirect('/superpowers');

        // Password verified, but the 2FA gate diverts protected routes.
        $this->assertAuthenticatedAs($admin, 'platform');
        $this->assertNull(session('platform.2fa.verified'));
        $this->get('/superpowers')->assertRedirect('/superpowers/2fa/challenge');

        // Login is only audited once the challenge is cleared.
        $this->assertDatabaseMissing('platform_activity_logs', [
            'platform_admin_id' => $admin->id,
            'action' => 'login',
        ]);

        $this->post('/superpowers/2fa/challenge', [
            'code' => (new Google2FA)->getCurrentOtp($secret),
        ])->assertRedirect('/superpowers');

        $this->assertSame($admin->id, session('platform.2fa.verified'));
        $this->get('/superpowers')->assertOk();
    }

    public function test_invalid_totp_code_is_rejected(): void
    {
        [$admin] = $this->createAdminWithTotp();

        $this->actingAs($admin, 'platform')
            ->from('/superpowers/2fa/challenge')
            ->post('/superpowers/2fa/challenge', ['code' => '000000'])
            ->assertSessionHasErrors('code');

        $this->assertNull(session('platform.2fa.verified'));
    }

    public function test_recovery_code_is_single_use(): void
    {
        [$admin] = $this->createAdminWithTotp();
        $codes = $admin->generateRecoveryCodes();
        $admin->save();

        $this->actingAs($admin, 'platform')
            ->post('/superpowers/2fa/recovery', ['recovery_code' => $codes[0]])
            ->assertRedirect('/superpowers');

        $this->assertSame($admin->id, session('platform.2fa.verified'));
        $this->assertCount(7, $admin->fresh()->two_factor_recovery_codes);

        // Replaying the same code fails.
        $this->flushSession();
        $this->actingAs($admin, 'platform')
            ->from('/superpowers/2fa/challenge')
            ->post('/superpowers/2fa/recovery', ['recovery_code' => $codes[0]])
            ->assertSessionHasErrors('recovery_code');
    }

    public function test_recovery_codes_are_stored_hashed_not_plaintext(): void
    {
        [$admin] = $this->createAdminWithTotp();
        $codes = $admin->generateRecoveryCodes();
        $admin->save();

        $stored = $admin->fresh()->two_factor_recovery_codes;

        $this->assertNotContains($codes[0], $stored);
        $this->assertContains(hash('sha256', $codes[0]), $stored);
    }

    public function test_totp_secret_is_encrypted_at_rest_and_never_serialized(): void
    {
        [$admin, $secret] = $this->createAdminWithTotp();

        $raw = DB::table('platform_admins')
            ->where('id', $admin->id)
            ->value('two_factor_secret');

        $this->assertNotSame($secret, $raw);
        $this->assertSame($secret, $admin->fresh()->two_factor_secret);

        // Hidden from array/JSON output so it cannot leak into logs or props.
        $serialized = $admin->fresh()->toArray();
        $this->assertArrayNotHasKey('two_factor_secret', $serialized);
        $this->assertArrayNotHasKey('two_factor_recovery_codes', $serialized);
        $this->assertArrayNotHasKey('password', $serialized);
    }

    public function test_shared_platform_admin_prop_excludes_secrets(): void
    {
        [$admin] = $this->createAdminWithTotp();
        $this->actingAsPlatformAdmin($admin);

        $this->get('/superpowers')->assertInertia(fn ($page) => $page
            ->where('platformAdmin.id', $admin->id)
            ->where('platformAdmin.has_two_factor', true)
            ->missing('platformAdmin.two_factor_secret')
            ->missing('platformAdmin.two_factor_recovery_codes')
            ->missing('platformAdmin.password')
        );
    }

    public function test_authenticated_admin_is_redirected_away_from_login(): void
    {
        $this->actingAsPlatformAdmin();

        $this->get('/superpowers/login')->assertRedirect('/superpowers');
    }

    public function test_logout_clears_two_factor_marker_and_audits(): void
    {
        $admin = $this->actingAsPlatformAdmin();

        $this->post('/superpowers/logout')->assertRedirect('/superpowers/login');

        $this->assertGuest('platform');
        $this->assertNull(session('platform.2fa.verified'));
        $this->assertDatabaseHas('platform_activity_logs', [
            'platform_admin_id' => $admin->id,
            'action' => 'logout',
        ]);
    }

    public function test_login_is_throttled_after_five_attempts(): void
    {
        $admin = $this->createAdmin();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post('/superpowers/login', [
                'email' => $admin->email,
                'password' => 'wrong-password',
            ]);
        }

        $this->post('/superpowers/login', [
            'email' => $admin->email,
            'password' => 'platform-secret',
        ])->assertStatus(429);

        $this->assertGuest('platform');
    }

    public function test_create_admin_command_provisions_totp_and_recovery_codes(): void
    {
        $this->artisan('superpowers:create-admin', [
            '--name' => 'Ops Dev',
            '--email' => 'ops@pogrid.test',
            '--password' => 'ops-secret-123',
        ])->assertSuccessful();

        $admin = PlatformAdmin::where('email', 'ops@pogrid.test')->firstOrFail();

        $this->assertTrue($admin->hasTwoFactorEnabled());
        $this->assertCount(8, $admin->two_factor_recovery_codes);
        $this->assertTrue(Hash::check('ops-secret-123', $admin->password));

        // Command output is the only time secrets are shown; nothing is logged.
        $this->assertDatabaseCount(PlatformActivityLog::class, 0);
    }

    public function test_create_admin_command_rejects_duplicate_email(): void
    {
        $this->createAdmin(['email' => 'dupe@pogrid.test']);

        $this->artisan('superpowers:create-admin', [
            '--name' => 'Dupe',
            '--email' => 'dupe@pogrid.test',
            '--password' => 'another-secret',
        ])->assertFailed();
    }
}
