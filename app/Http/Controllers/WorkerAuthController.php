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
        
        $workers = User::where('tenant_id', $tenant->id)
            ->whereNotNull('pin')
            ->get(['id', 'name', 'role']);

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
            ->firstOrFail();

        if (Hash::check($request->pin, $user->pin)) {
            Auth::login($user);
            $request->session()->regenerate();
            return redirect("/c/{$slug}/dashboard");
        }

        return back()->withErrors([
            'pin' => 'Incorrect PIN.',
        ]);
    }
}
