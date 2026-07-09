<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Services\TenantManager;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function index(Request $request, $slug)
    {
        // Resolve tenant
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->first();
        if (! $tenant) {
            abort(404, 'Tenant not found.');
        }
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        $user = auth()->user();
        if (! $user || $user->tenant_id !== $tenant->id) {
            abort(403);
        }

        return Inertia::render('Owner/Profile', [
            'tenant' => $tenant,
            'auth_user' => $user,
        ]);
    }
}
