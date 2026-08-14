<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\WelcomeAndTutorialNotification;
use App\Services\TenantManager;
use Illuminate\Auth\Events\Registered;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
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
        // Normalize slug BEFORE validation so the uniqueness check runs against
        // the value actually stored (slugs are stored lowercase).
        $request->merge(['slug' => strtolower((string) $request->input('slug'))]);

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

        $slug = $request->slug; // already normalized + validated above

        $hasAttribution = $request->filled('utm_source')
            || $request->filled('utm_medium')
            || $request->filled('utm_campaign')
            || $request->filled('utm_content')
            || $request->filled('ref');

        $staffRoleId = Role::where('name', 'STAFF')->value('id');
        $managerPostId = Post::where('name', 'Manager')->value('id');

        // Generate a unique username from name
        $nameWithoutSpaces = str_replace(' ', '.', strtolower(trim($request->name)));
        $usernamePrefix = preg_replace('/[^a-z0-9\._]/', '', $nameWithoutSpaces);
        if (empty($usernamePrefix)) {
            $usernamePrefix = 'owner';
        }

        // Tenant + owner user are one business operation: wrap atomically.
        // The users.username unique index is the final guarantee against the
        // check-then-insert race; on a collision the whole transaction rolls
        // back and is retried with a fresh suffix (safe: the tenant row is
        // rolled back with it and recreated on the next attempt).
        $tenant = null;
        $user = null;
        $username = $usernamePrefix;

        for ($attempt = 0; $attempt < 5; $attempt++) {
            try {
                [$tenant, $user] = DB::transaction(function () use ($request, $slug, $hasAttribution, $staffRoleId, $managerPostId, $username) {
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

                    return [$tenant, $user];
                });
                break;
            } catch (QueryException $e) {
                $isUsernameCollision = str_contains($e->getMessage(), 'username');
                if (! $isUsernameCollision || $attempt === 4) {
                    throw $e;
                }
                $username = $usernamePrefix.'_'.Str::random(4);
            }
        }

        event(new Registered($user));

        try {
            $user->notify(new WelcomeAndTutorialNotification($user->name, $tenant->company_name));
        } catch (\Throwable $e) {
            Log::error('Failed to send WelcomeAndTutorialNotification upon registration: '.$e->getMessage(), [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);
        }

        // Log the user in
        Auth::login($user);

        $request->session()->regenerate();

        return redirect('/selamat-datang');
    }
}
