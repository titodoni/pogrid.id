<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetTenant;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            SetTenant::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->header('X-Inertia') || $request->wantsJson()) {
                $retryAfter = $e->getHeaders()['Retry-After'] ?? 60;

                return back()->withErrors([
                    'pin' => 'too_many_attempts',
                ])->with('retry_after', $retryAfter);
            }
        });
        $exceptions->render(function (HttpException $e, Request $request) {
            if ($request->inertia()) {
                $status = $e->getStatusCode();
                $component = match ($status) {
                    403 => 'Errors/403',
                    404 => 'Errors/404',
                    419 => 'Errors/419',
                    500 => 'Errors/500',
                    default => null,
                };
                if ($component) {
                    return Inertia::render($component, ['status' => $status])
                        ->toResponse($request)
                        ->setStatusCode($status);
                }
            }
        });
    })->create();
