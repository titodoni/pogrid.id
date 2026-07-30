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

        // Register general real-time synchronization observer
        $syncModels = [
            \App\Models\Po::class,
            \App\Models\Item::class,
            \App\Models\ItemProgress::class,
            \App\Models\Alert::class,
            \App\Models\User::class,
            \App\Models\Tenant::class,
            \App\Models\TenantStageTemplate::class,
            \App\Models\DoItem::class,
            \App\Models\DeliveryOrder::class,
        ];
        foreach ($syncModels as $modelClass) {
            $modelClass::observe(\App\Observers\DataSyncObserver::class);
        }

        \Illuminate\Support\Facades\Event::listen(
            \Illuminate\Mail\Events\MessageSending::class,
            function (\Illuminate\Mail\Events\MessageSending $event) {
                $email = $event->message;
                
                $toAddresses = [];
                foreach (($email->getTo() ?: []) as $address) {
                    $toAddresses[] = $address->getAddress();
                }
                $to = implode(', ', $toAddresses);
                
                $subject = $email->getSubject();
                $body = $email->getHtmlBody() ?: $email->getTextBody();
                
                $cleanBody = strip_tags($body);
                $cleanBody = html_entity_decode($cleanBody, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                
                $logContent = "=========================================\n";
                $logContent .= "Date: " . now()->toDateTimeString() . "\n";
                $logContent .= "To: " . $to . "\n";
                $logContent .= "Subject: " . $subject . "\n";
                $logContent .= "Body:\n" . trim($cleanBody) . "\n";
                $logContent .= "=========================================\n\n";
                
                $logsDir = base_path('logs');
                if (!\Illuminate\Support\Facades\File::exists($logsDir)) {
                    \Illuminate\Support\Facades\File::makeDirectory($logsDir, 0755, true);
                }
                \Illuminate\Support\Facades\File::append($logsDir . '/verification-emails.log', $logContent);
            }
        );

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
