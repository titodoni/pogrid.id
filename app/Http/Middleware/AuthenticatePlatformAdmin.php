<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticate middleware for the platform guard. Redirects unauthenticated
 * superadmins to the login page.
 */
class AuthenticatePlatformAdmin
{
    public function handle(Request $request, Closure $next, ?string $redirectToRoute = null): Response
    {
        if (! auth()->guard('platform')->check()) {
            return redirect()->guest(route('superpowers.login', [], false));
        }

        if (! auth()->guard('platform')->user()->is_active) {
            auth()->guard('platform')->logout();

            return redirect()
                ->route('superpowers.login')
                ->withErrors(['email' => 'Akun superadmin tidak aktif.']);
        }

        return $next($request);
    }
}
