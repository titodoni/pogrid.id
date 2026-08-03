<?php

namespace App\Providers;

use App\Models\Alert;
use App\Models\DeliveryOrder;
use App\Models\DoItem;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\TenantStageTemplate;
use App\Models\User;
use App\Observers\AlertObserver;
use App\Observers\DataSyncObserver;
use App\Observers\DoItemObserver;
use App\Observers\ItemObserver;
use App\Observers\ItemProgressObserver;
use App\Services\TenantManager;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\File;
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
        Alert::observe(AlertObserver::class);

        // Register general real-time synchronization observer
        $syncModels = [
            Po::class,
            Item::class,
            ItemProgress::class,
            Alert::class,
            User::class,
            Tenant::class,
            TenantStageTemplate::class,
            DoItem::class,
            DeliveryOrder::class,
        ];
        foreach ($syncModels as $modelClass) {
            $modelClass::observe(DataSyncObserver::class);
        }

        Event::listen(
            MessageSending::class,
            function (MessageSending $event) {
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
                $logContent .= 'Date: '.now()->toDateTimeString()."\n";
                $logContent .= 'To: '.$to."\n";
                $logContent .= 'Subject: '.$subject."\n";
                $logContent .= "Body:\n".trim($cleanBody)."\n";
                $logContent .= "=========================================\n\n";

                $logsDir = base_path('logs');
                if (! File::exists($logsDir)) {
                    File::makeDirectory($logsDir, 0755, true);
                }
                File::append($logsDir.'/verification-emails.log', $logContent);
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

        Inertia::share('tenant', function () {
            $tenantId = TenantManager::getTenantId();
            if (! $tenantId && auth()->check()) {
                $tenantId = auth()->user()->tenant_id;
            }
            if ($tenantId) {
                TenantManager::bypass();
                $tenant = Tenant::find($tenantId);
                TenantManager::enableScope();
                if ($tenant) {
                    return [
                        'id' => $tenant->id,
                        'company_name' => $tenant->company_name,
                        'slug' => $tenant->slug,
                        'logo_path' => $tenant->logo_path,
                        'theme' => $tenant->theme ?? 'theme-default',
                        'workflow_settings' => $tenant->workflow_settings,
                    ];
                }
            }

            return null;
        });
    }
}
