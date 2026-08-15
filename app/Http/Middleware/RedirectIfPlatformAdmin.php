<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guest-only middleware for the platform guard. Redirects authenticated
 * superadmins away from login/registration pages to the dashboard.
 */
class RedirectIfPlatformAdmin
{
    public function handle(Request $request, Closure $next, ?string $redirectToRoute = null): Response
    {
        if (auth()->guard('platform')->check()) {
            return redirect()->route('superpowers.dashboard');
        }

        return $next($request);
    }
}
