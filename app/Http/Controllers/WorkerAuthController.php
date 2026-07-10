<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class WorkerAuthController extends Controller
{
    public function showLogin($slug)
    {
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->firstOrFail();
        TenantManager::enableScope();

        $workers = User::where('tenant_id', $tenant->id)
            ->whereNotNull('pin')
            ->with('roleRelation:id,name', 'postRelation:id,name')
            ->get(['id', 'name', 'role_id', 'post_id']);

        return Inertia::render('Worker/Login', [
            'tenant' => [
                'id' => $tenant->id,
                'company_name' => $tenant->company_name,
                'slug' => $tenant->slug,
            ],
            'workers' => $workers,
        ]);
    }

    public function login(Request $request, $slug)
    {
        $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'pin' => ['required', 'string', 'min:4', 'max:6'],
        ]);

        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->firstOrFail();
        $user = User::where('id', $request->user_id)
            ->where('tenant_id', $tenant->id)
            ->with('roleRelation:id,name,level')
            ->firstOrFail();
        TenantManager::enableScope();

        // Block office administrative roles from PIN-based login (privilege escalation protection)
        if ($user->role_level === 'office') {
            return back()->withErrors([
                'pin' => 'admin_must_use_password',
            ]);
        }

        if (Hash::check($request->pin, $user->pin)) {
            Auth::login($user);
            $request->session()->regenerate();

            return redirect("/c/{$slug}");
        }

        return back()->withErrors([
            'pin' => 'pin_incorrect',
        ]);
    }
}
