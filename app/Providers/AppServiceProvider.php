<?php

namespace App\Providers;

use App\Models\DoItem;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Observers\DoItemObserver;
use App\Observers\ItemObserver;
use App\Observers\ItemProgressObserver;
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
        Item::observe(ItemObserver::class);
        ItemProgress::observe(ItemProgressObserver::class);
        DoItem::observe(DoItemObserver::class);

        Inertia::share('flash', function () {
            return [
                'success' => session('success'),
                'error' => session('error'),
                'warning' => session('warning'),
                'info' => session('info'),
            ];
        });

        Inertia::share('retry_after', fn () => session('retry_after'));

        Inertia::share('pusher', function () {
            return [
                'key' => config('broadcasting.connections.pusher.key'),
                'cluster' => config('broadcasting.connections.pusher.options.cluster'),
            ];
        });
    }
}
