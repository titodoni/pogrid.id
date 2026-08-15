<?php

namespace App\Http\Middleware;

use App\Models\PlatformSetting;
use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

/**
 * Block tenant access during platform-wide maintenance mode. Superadmin
 * routes are unaffected because they run without tenant context.
 */
class CheckTenantMaintenance
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = TenantManager::getTenantId();

        if ($tenantId === null) {
            return $next($request);
        }

        if (! PlatformSetting::isMaintenanceMode()) {
            return $next($request);
        }

        $message = PlatformSetting::getMaintenanceMessage()
            ?? 'POGrid sedang dalam maintenance. Silakan coba lagi nanti.';

        // Thrown (not returned) so the central handler in bootstrap/app.php
        // renders the branded Inertia `Errors/503` page for browser/Inertia
        // requests and falls back to JSON for API clients.
        throw new ServiceUnavailableHttpException(300, $message);
    }
}
