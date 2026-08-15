<?php

namespace App\Http\Middleware;

use App\Models\PlatformAdmin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Require 2FA challenge for superadmins. Users who have enabled 2FA must
 * complete it before accessing any protected superadmin routes. Redirects
 * to a challenge page if not yet verified.
 */
class RequireTwoFactorChallenge
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->guard('platform')->user();

        if (! $user instanceof PlatformAdmin) {
            return $next($request);
        }

        if (! $user->hasTwoFactorEnabled()) {
            return $next($request);
        }

        if (session()->has('platform.2fa.verified') &&
            session()->get('platform.2fa.verified') === $user->id) {
            return $next($request);
        }

        return redirect()->route('superpowers.2fa.challenge');
    }
}
