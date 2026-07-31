<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectToAppDomain
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $host = $request->getHost();

        // Enforce only for pogrid.id domain in production
        if (str_ends_with($host, 'pogrid.id')) {
            $isAppSubdomain = str_starts_with($host, 'app.');

            if (!$isAppSubdomain && !in_array($request->path(), ['/', 'terms', 'privacy'])) {
                // If on main domain (pogrid.id / www.pogrid.id) and requesting app routes (e.g. /login, /register),
                // redirect them to the same route on app.pogrid.id
                return redirect('https://app.pogrid.id/' . ltrim($request->getRequestUri(), '/'));
            }
        }

        return $next($request);
    }
}
