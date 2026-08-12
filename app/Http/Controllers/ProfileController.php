<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Services\TenantManager;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function index(Request $request, $slug = null)
    {
        $user = auth()->user();
        if (! $user) {
            return redirect()->route('login');
        }

        if ($slug) {
            TenantManager::bypass();
            $tenant = Tenant::where('slug', $slug)->first();
            if (! $tenant) {
                abort(404, 'Tenant not found.');
            }
            TenantManager::enableScope();
            TenantManager::setTenantId($tenant->id);

            \Illuminate\Support\Facades\Gate::authorize('view-tenant', $tenant->id);
        } else {
            $tenant = Tenant::find($user->tenant_id);
            if (! $tenant) {
                abort(404, 'Tenant not found.');
            }
        }

        return Inertia::render('Owner/Profile', [
            'tenant' => $tenant,
            'auth_user' => $user,
        ]);
    }
}
