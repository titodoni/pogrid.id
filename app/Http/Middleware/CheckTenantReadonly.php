<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Block mutations when tenant is in read-only mode. Only applies to tenant-
 * scoped routes (uses TenantManager::$tenantId). Superadmin routes are
 * unaffected because they run without tenant context.
 *
 * Reads are allowed; mutations (POST/PUT/DELETE/PATCH) are rejected with 403.
 */
class CheckTenantReadonly
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethodSafe()) {
            return $next($request);
        }

        $tenantId = TenantManager::getTenantId();

        if ($tenantId === null) {
            return $next($request);
        }

        $tenant = Tenant::find($tenantId);

        if ($tenant && $tenant->isReadonly()) {
            return response()->json([
                'message' => 'Tenant dalam mode read-only. Operasi tidak diizinkan.',
            ], 403);
        }

        return $next($request);
    }
}
