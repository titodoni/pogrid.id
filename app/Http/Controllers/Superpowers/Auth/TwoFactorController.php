<?php

namespace App\Http\Controllers\Superpowers\Auth;

use App\Http\Controllers\Controller;
use App\Models\PlatformActivityLog;
use App\Models\PlatformAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class TwoFactorController extends Controller
{
    public function showChallenge()
    {
        return Inertia::render('Superpowers/TwoFactorChallenge');
    }

    public function verify(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $admin = $this->resolvePendingAdmin();
        if (! $admin instanceof PlatformAdmin) {
            return redirect()->route('superpowers.login');
        }

        $code = preg_replace('/\s+/', '', $data['code']);

        if (! $admin->verifyTotp($code)) {
            throw ValidationException::withMessages([
                'code' => 'Kode verifikasi tidak valid.',
            ]);
        }

        $this->markVerified($admin, $request);

        return redirect()->route('superpowers.dashboard');
    }

    public function useRecoveryCode(Request $request)
    {
        $data = $request->validate([
            'recovery_code' => ['required', 'string'],
        ]);

        $admin = $this->resolvePendingAdmin();
        if (! $admin instanceof PlatformAdmin) {
            return redirect()->route('superpowers.login');
        }

        if (! $admin->useRecoveryCode($data['recovery_code'])) {
            throw ValidationException::withMessages([
                'recovery_code' => 'Kode pemulihan tidak valid atau sudah dipakai.',
            ]);
        }

        $this->markVerified($admin, $request);

        return redirect()->route('superpowers.dashboard');
    }

    /**
     * Resolve the partially-authenticated admin. The platform.auth middleware
     * guarantees the session is authenticated, so we use the guard directly.
     */
    protected function resolvePendingAdmin(): ?PlatformAdmin
    {
        $admin = Auth::guard('platform')->user();

        return $admin instanceof PlatformAdmin ? $admin : null;
    }

    protected function markVerified(PlatformAdmin $admin, Request $request): void
    {
        $request->session()->put('platform.2fa.verified', $admin->id);
        $admin->forceFill(['last_login_at' => now()])->save();

        PlatformActivityLog::create([
            'platform_admin_id' => $admin->id,
            'action' => 'login',
            'metadata' => ['ip' => $request->ip(), 'method' => '2fa'],
        ]);
    }
}
