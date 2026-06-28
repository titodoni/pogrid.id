<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;

class RegistrationController extends Controller
{
    public function showRegister()
    {
        return Inertia::render('Auth/Register');
    }

    public function register(Request $request)
    {
        $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:10', 'alpha_num', 'unique:tenants,slug'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $slug = strtolower($request->slug);

        // Create Tenant
        $tenant = Tenant::create([
            'company_name' => $request->company_name,
            'slug' => $slug,
            'subscription_status' => 'active',
            'trial_ends_at' => now()->addDays(30),
        ]);

        // Establish tenant context for new user creation
        TenantManager::setTenantId($tenant->id);

        // Create Owner Admin user (OWNER role, email-login based)
        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => $request->name,
            'email' => $request->email,
            'username' => 'owner_' . Str::random(6),
            'password' => Hash::make($request->password),
            'role' => 'OWNER',
        ]);

        // Log the user in
        Auth::login($user);
        
        $request->session()->regenerate();

        return redirect("/c/{$slug}");
    }
}
