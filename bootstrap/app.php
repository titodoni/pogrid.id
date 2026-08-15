<?php

use App\Http\Middleware\AuthenticatePlatformAdmin;
use App\Http\Middleware\CheckTenantMaintenance;
use App\Http\Middleware\CheckTenantReadonly;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectIfPlatformAdmin;
use App\Http\Middleware\RedirectToAppDomain;
use App\Http\Middleware\RequireTwoFactorChallenge;
use App\Http\Middleware\SetTenant;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        then: function (): void {
            Route::middleware('web')
                ->group(__DIR__.'/../routes/superpowers.php');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            RedirectToAppDomain::class,
            HandleInertiaRequests::class,
            SetTenant::class,
        ]);
        $middleware->alias([
            'verified' => EnsureEmailIsVerified::class,
            'platform.auth' => AuthenticatePlatformAdmin::class,
            'platform.guest' => RedirectIfPlatformAdmin::class,
            'platform.2fa' => RequireTwoFactorChallenge::class,
            'tenant.readonly' => CheckTenantReadonly::class,
            'tenant.maintenance' => CheckTenantMaintenance::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->header('X-Inertia') || $request->wantsJson()) {
                $retryAfter = $e->getHeaders()['Retry-After'] ?? 60;

                // Worker PIN login displays the error under the 'pin' field;
                // all other forms surface errors via flash toasts (key-agnostic).
                $errorKey = $request->is('c/*/login') ? 'pin' : 'username';

                return back()->withErrors([
                    $errorKey => 'too_many_attempts',
                ])->with('retry_after', $retryAfter);
            }
        });
        $exceptions->render(function (HttpException $e, Request $request) {
            $status = $e->getStatusCode();
            $component = match ($status) {
                403 => 'Errors/403',
                404 => 'Errors/404',
                419 => 'Errors/419',
                500 => 'Errors/500',
                503 => 'Errors/503',
                default => null,
            };

            if (! $component) {
                return null;
            }

            if ($request->is('api/*')) {
                return null;
            }

            $props = ['status' => $status];

            // Maintenance mode carries an operator-authored message that the
            // 503 page displays; other statuses use static copy.
            if ($status === 503 && $e->getMessage() !== '') {
                $props['message'] = $e->getMessage();
            }

            // Covers both Inertia XHR requests and direct browser navigations
            // so the branded component is served instead of the Blade fallback.
            return Inertia::render($component, $props)
                ->toResponse($request)
                ->setStatusCode($status)
                ->withHeaders($e->getHeaders());
        });
    })->create();
