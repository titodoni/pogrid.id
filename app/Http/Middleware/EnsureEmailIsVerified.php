<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $redirectToRoute = null): Response
    {
        if (app()->environment('testing')) {
            return $next($request);
        }

        if (! $request->user() ||
            ($request->user() instanceof MustVerifyEmail &&
            ! $request->user()->hasVerifiedEmail())) {
            return $request->expectsJson()
                ? abort(403, 'Your email address is not verified.')
                : redirect()->guest(route($redirectToRoute ?: 'verification.notice'));
        }

        return $next($request);
    }
}
