<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Auth\Events\Registered;
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
            'password' => ['required', 'string', 'min:8', 'regex:/[0-9]/', 'confirmed'],
            'utm_source' => ['nullable', 'string', 'max:255'],
            'utm_medium' => ['nullable', 'string', 'max:255'],
            'utm_campaign' => ['nullable', 'string', 'max:255'],
            'utm_content' => ['nullable', 'string', 'max:255'],
            'ref' => ['nullable', 'string', 'max:255'],
        ], [
            'password.min' => 'The password must be at least 8 characters.',
            'password.regex' => 'The password must contain at least one number.',
        ]);

        $slug = strtolower($request->slug);

        $hasAttribution = $request->filled('utm_source')
            || $request->filled('utm_medium')
            || $request->filled('utm_campaign')
            || $request->filled('utm_content')
            || $request->filled('ref');

        // Create Tenant
        $tenant = Tenant::create([
            'company_name' => $request->company_name,
            'slug' => $slug,
            'subscription_status' => 'active',
            'trial_ends_at' => now()->addDays(30),
            'attribution_source' => $request->input('utm_source'),
            'attribution_medium' => $request->input('utm_medium'),
            'attribution_campaign' => $request->input('utm_campaign'),
            'attribution_content' => $request->input('utm_content'),
            'attribution_ref' => $request->input('ref'),
            'attributed_at' => $hasAttribution ? now() : null,
        ]);

        // Establish tenant context for new user creation
        TenantManager::setTenantId($tenant->id);

        $staffRoleId = Role::where('name', 'STAFF')->value('id');
        $managerPostId = Post::where('name', 'Manager')->value('id');

        // Generate a unique username from name
        $nameWithoutSpaces = str_replace(' ', '.', strtolower(trim($request->name)));
        $usernamePrefix = preg_replace('/[^a-z0-9\._]/', '', $nameWithoutSpaces);
        if (empty($usernamePrefix)) {
            $usernamePrefix = 'owner';
        }
        $username = $usernamePrefix;
        if (User::where('username', $username)->exists()) {
            $username = $usernamePrefix.'_'.Str::random(4);
            while (User::where('username', $username)->exists()) {
                $username = $usernamePrefix.'_'.Str::random(4);
            }
        }

        // Create Owner user
        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => $request->name,
            'email' => $request->email,
            'username' => $username,
            'password' => Hash::make($request->password),
            'role_id' => $staffRoleId,
            'post_id' => $managerPostId,
            'is_owner' => true,
        ]);

        event(new Registered($user));

        // Log the user in
        Auth::login($user);

        $request->session()->regenerate();

        return redirect('/selamat-datang');
    }
}
