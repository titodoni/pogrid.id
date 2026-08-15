<?php

namespace App\Http\Controllers\Superpowers;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\TenantManager;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubscriptionController extends Controller
{
    public function index(Request $request)
    {
        $subscriptions = TenantManager::runWithoutScope(function () use ($request) {
            return Tenant::with('plan:id,name,price')
                ->withTrashed()
                ->whereNotNull('plan_id')
                ->subscriptionFilter($request->string('status')->toString())
                ->orderByDesc('id')
                ->paginate(25)
                ->through(fn ($tenant) => [
                    'id' => $tenant->id,
                    'company_name' => $tenant->company_name,
                    'slug' => $tenant->slug,
                    'subscription_status' => $tenant->subscription_status,
                    'plan' => $tenant->plan ? [
                        'id' => $tenant->plan->id,
                        'name' => $tenant->plan->name,
                        'price_cents' => $tenant->plan->price,
                    ] : null,
                    'is_active' => $tenant->hasActiveSubscription(),
                    'is_readonly' => $tenant->isReadonly(),
                    'deleted_at' => $tenant->deleted_at?->toIso8601String(),
                    'created_at' => $tenant->created_at?->toIso8601String(),
                ]);
        });

        $totals = TenantManager::runWithoutScope(function () {
            // Aggregated in SQL — the previous implementation hydrated every
            // tenant and lazy-loaded `plan` per row (N+1).
            $mrrCents = (int) Tenant::query()
                ->whereNotNull('plan_id')
                ->activeSubscription()
                ->join('plans', 'plans.id', '=', 'tenants.plan_id')
                ->sum('plans.price');

            return [
                'mrr_cents' => $mrrCents,
                'active_count' => Tenant::query()
                    ->whereNotNull('plan_id')
                    ->activeSubscription()
                    ->count(),
                'readonly_count' => Tenant::query()
                    ->whereNotNull('plan_id')
                    ->readonlySubscription()
                    ->count(),
            ];
        });

        return Inertia::render('Superpowers/Subscriptions/Index', [
            'subscriptions' => $subscriptions,
            'totals' => $totals,
            'filters' => ['status' => $request->string('status')->toString() ?: 'all'],
        ]);
    }
}
