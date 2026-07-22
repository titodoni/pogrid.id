<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        // Check route parameter first to set or switch tenant
        $slug = $request->route('slug');
        if ($slug) {
            // Temporarily bypass TenantScope to find the tenant by slug
            TenantManager::bypass();
            $tenant = Tenant::where('slug', $slug)->first();
            TenantManager::enableScope();

            if ($tenant) {
                session([
                    'active_tenant_id' => $tenant->id,
                    'active_tenant_slug' => $tenant->slug,
                    'active_company_name' => $tenant->company_name,
                ]);
                TenantManager::setTenantId($tenant->id);
            }
        }

        TenantManager::bypass();
        $user = auth()->user();
        TenantManager::enableScope();

        if ($user) {
            TenantManager::setTenantId($user->tenant_id);
        } elseif (session()->has('active_tenant_id')) {
            TenantManager::setTenantId(session('active_tenant_id'));
        }

        return $next($request);
    }
}
