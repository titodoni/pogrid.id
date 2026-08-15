<?php

namespace App\Http\Controllers\Superpowers\Auth;

use App\Http\Controllers\Controller;
use App\Models\PlatformActivityLog;
use App\Models\PlatformAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LoginController extends Controller
{
    public function showLogin()
    {
        return Inertia::render('Superpowers/Login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::guard('platform')->attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => 'Email atau kata sandi salah.',
            ]);
        }

        $admin = Auth::guard('platform')->user();

        if (! $admin->is_active) {
            Auth::guard('platform')->logout();

            throw ValidationException::withMessages([
                'email' => 'Akun superadmin tidak aktif.',
            ]);
        }

        $request->session()->regenerate();

        // Admins without 2FA are immediately marked verified; admins with 2FA
        // are routed to the challenge by the platform.2fa middleware.
        if (! $admin->hasTwoFactorEnabled()) {
            $request->session()->put('platform.2fa.verified', $admin->id);
            $admin->forceFill(['last_login_at' => now()])->save();

            PlatformActivityLog::create([
                'platform_admin_id' => $admin->id,
                'action' => 'login',
                'metadata' => ['ip' => $request->ip()],
            ]);
        }

        return redirect()->route('superpowers.dashboard');
    }

    public function logout(Request $request)
    {
        $admin = Auth::guard('platform')->user();

        if ($admin instanceof PlatformAdmin) {
            PlatformActivityLog::create([
                'platform_admin_id' => $admin->id,
                'action' => 'logout',
            ]);
        }

        Auth::guard('platform')->logout();

        $request->session()->forget('platform.2fa.verified');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('superpowers.login');
    }
}
