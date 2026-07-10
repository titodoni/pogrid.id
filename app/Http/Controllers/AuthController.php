<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showLogin()
    {
        return Inertia::render('Auth/Login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required'],
        ]);

        $field = filter_var($request->username, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        // Check user exists first for better error messaging
        TenantManager::bypass();
        $user = User::where($field, $request->username)->first();
        TenantManager::enableScope();

        if (!$user) {
            return back()->withErrors([
                'username' => 'user_not_found',
            ])->onlyInput('username');
        }

        if (Auth::attempt([$field => $request->username, 'password' => $request->password])) {
            $request->session()->regenerate();
            $user = Auth::user();
            $slug = Tenant::find($user->tenant_id)?->slug;

            return redirect()->intended($slug ? "/c/{$slug}" : '/dashboard');
        }

        return back()->withErrors([
            'username' => 'wrong_password',
        ])->onlyInput('username');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
