<?php

namespace App\Providers;

use App\Auth\TenantSafeEloquentUserProvider;
use App\Enums\ItemStatus;
use App\Enums\PoStatus;
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
use Illuminate\Auth\Access\Response;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
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
        // Identity resolution is pre-tenant (session layer runs before
        // SetTenant): use the tenant-safe provider for user retrieval.
        Auth::provider('tenant-safe-eloquent', function ($app, array $config) {
            return new TenantSafeEloquentUserProvider($app['hash'], $config['model']);
        });

        // Office login throttling keyed by credential+IP (not bare IP), so
        // office staff behind a shared NAT don't lock each other out.
        RateLimiter::for('login-office', function ($request) {
            return Limit::perMinute(5)
                ->by(strtolower((string) $request->input('username')).'|'.$request->ip());
        });

        Gate::define('update-finance-status-lock', function ($user, $item) {
            return $item->delivery_status !== 'PENDING'
                ? Response::allow()
                : Response::deny('Stage locked: Finance status cannot be updated until at least one item has been delivered.');
        });
        Gate::define('manage-company-settings', function ($user) {
            return ! ($user->isManager() || $user->isSales())
                ? Response::allow()
                : Response::deny('Managers and Sales cannot modify company settings.');
        });

        Gate::define('manage-workflow-settings', function ($user) {
            return ! ($user->isManager() || $user->isSales())
                ? Response::allow()
                : Response::deny('Managers and Sales cannot modify workflow settings.');
        });

        Gate::define('manage-stage-templates', function ($user) {
            return ! ($user->isManager() || $user->isSales())
                ? Response::allow()
                : Response::deny('Managers and Sales cannot manage stage templates.');
        });

        Gate::define('create-admin', function ($user) {
            return $user->isOwner()
                ? Response::allow()
                : Response::deny('Only owners can create admin users during onboarding.');
        });

        Gate::define('view-tenant', function ($user, $tenantId) {
            return $user->tenant_id === $tenantId
                ? Response::allow()
                : Response::deny('Unauthorized tenant access.');
        });

        Gate::define('access-office', function ($user) {
            $user->load('roleRelation');

            return $user->role_level === 'office'
                ? Response::allow()
                : Response::deny('Unauthorized role.');
        });

        Gate::define('resolve-trouble', function ($user) {
            return in_array(strtoupper($user->role_name ?? ''), ['PPIC', 'ADMIN', 'OWNER', 'MANAGER'])
                ? Response::allow()
                : Response::deny('Only PPIC, Admin, Owner, or Manager can resolve trouble reports.');
        });

        Gate::define('log-rework', function ($user) {
            return strtoupper($user->role_name ?? '') === 'QC'
                ? Response::allow()
                : Response::deny('Forbidden: Only QC inspectors can log rework.');
        });

        Gate::define('update-drafter', function ($user) {
            return strtoupper($user->role_name ?? '') === 'DRAFTER'
                ? Response::allow()
                : Response::deny('Forbidden: Only Drafters can update drafter status.');
        });

        Gate::define('update-purchasing', function ($user) {
            return strtoupper($user->role_name ?? '') === 'PURCHASING'
                ? Response::allow()
                : Response::deny('Forbidden: Only Purchasing agents can update purchasing status.');
        });

        Gate::define('update-finance', function ($user) {
            return in_array(strtoupper($user->role_name ?? ''), ['FINANCE', 'MANAGER', 'OWNER'])
                ? Response::allow()
                : Response::deny('Forbidden: Only Finance controllers can update finance status.');
        });

        Gate::define('view-ledger', function ($user) {
            return in_array(strtoupper($user->role_name ?? ''), ['FINANCE', 'MANAGER', 'OWNER', 'ADMIN'])
                ? Response::allow()
                : Response::deny('Only Finance officers or Office managers can view the Finance Ledger.');
        });

        Gate::define('approve-pin-reset', function ($user) {
            return ($user->isOwner() || $user->isAdmin())
                ? Response::allow()
                : Response::deny('Only owners or admins can approve PIN resets.');
        });

        Gate::define('manage-ppic', function ($user) {
            $allowed = $user->isOwner() || $user->isAdmin() || $user->isManager()
                || strtoupper($user->role_name ?? '') === 'PPIC';

            return $allowed
                ? Response::allow()
                : Response::deny('Only PPIC, Admin, Owner, or Manager can modify production planning.');
        });
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

        Inertia::share('flash', function () {
            return [
                'success' => session('success'),
                'error' => session('error'),
                'warning' => session('warning'),
                'info' => session('info'),
            ];
        });

        Inertia::share('retry_after', fn () => session('retry_after'));

        // Server-owned business-rule configuration consumed by React.
        // Single source of truth: config/workflow.php. Never duplicate in JS.
        Inertia::share('workflow', fn () => [
            'stage_role_map' => config('workflow.stage_role_map'),
            'office_roles' => config('workflow.office_roles'),
            'pre_production_keywords' => config('workflow.pre_production_keywords'),
            'deadline' => config('workflow.deadline'),
            'item_statuses' => array_column(ItemStatus::cases(), 'value'),
            'po_statuses' => array_column(PoStatus::cases(), 'value'),
        ]);

        Inertia::share('pusher', function () {
            return [
                'key' => config('broadcasting.connections.pusher.key'),
                'cluster' => config('broadcasting.connections.pusher.options.cluster'),
            ];
        });

        Inertia::share('auth', function () {
            $user = auth()->user();
            if (! $user) {
                return ['user' => null];
            }

            return [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role_name' => $user->role_name,
                    'role_level' => $user->role_level,
                    'post_name' => $user->post_name,
                    'post_display_name' => $user->post_display_name,
                    'post_display_name_id' => $user->post_display_name_id,
                    'is_owner' => (bool) $user->is_owner,
                    'tenant_id' => $user->tenant_id,
                    'tenant_slug' => $user->tenant?->slug,
                ],
            ];
        });

        Inertia::share('tenant', function () {
            $tenantId = TenantManager::getTenantId();
            if (! $tenantId && auth()->check()) {
                $tenantId = auth()->user()->tenant_id;
            }
            if ($tenantId) {
                $tenant = TenantManager::runWithoutScope(fn () => Tenant::find($tenantId));
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
