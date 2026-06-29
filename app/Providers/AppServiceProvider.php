<?php

namespace App\Providers;

use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        \App\Models\Item::observe(\App\Observers\ItemObserver::class);
        \App\Models\ItemProgress::observe(\App\Observers\ItemProgressObserver::class);
        \App\Models\DoItem::observe(\App\Observers\DoItemObserver::class);

        Inertia::share('flash', function () {
            return [
                'success' => session('success'),
                'error' => session('error'),
            ];
        });
    }
}
