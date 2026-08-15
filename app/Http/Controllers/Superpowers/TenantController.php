<?php

namespace App\Http\Controllers\Superpowers;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\PlatformActivityLog;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantAnalyticsService;
use App\Services\TenantManager;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TenantController extends Controller
{
    public function index(Request $request)
    {
        $tenants = TenantManager::runWithoutScope(function () use ($request) {
            $query = Tenant::with('plan:id,name,price')
                ->withTrashed()
                ->withCount('users');

            if ($request->filled('search')) {
                $search = $request->string('search')->trim();
                $query->where(function ($q) use ($search) {
                    $q->where('company_name', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%");
                });
            }

            if ($request->filled('status')) {
                $query->subscriptionFilter($request->string('status')->toString());
            }

            return $query->orderByDesc('id')
                ->paginate(20)
                ->through(fn ($tenant) => [
                    'id' => $tenant->id,
                    'company_name' => $tenant->company_name,
                    'slug' => $tenant->slug,
                    'subscription_status' => $tenant->subscription_status,
                    'subscription_expires_at' => $tenant->subscription_expires_at?->toIso8601String(),
                    'plan' => $tenant->plan ? [
                        'id' => $tenant->plan->id,
                        'name' => $tenant->plan->name,
                        'price_cents' => $tenant->plan->price,
                    ] : null,
                    'users_count' => $tenant->users_count,
                    'deleted_at' => $tenant->deleted_at?->toIso8601String(),
                    'created_at' => $tenant->created_at?->toIso8601String(),
                ]);
        });

        return Inertia::render('Superpowers/Tenants/Index', [
            'tenants' => $tenants,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function create()
    {
        $plans = TenantManager::runWithoutScope(
            fn () => Plan::orderBy('price')->get(['id', 'name', 'price'])
        );

        return Inertia::render('Superpowers/Tenants/Create', [
            'plans' => $plans,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9-]+$/', 'unique:tenants,slug'],
            'plan_id' => ['nullable', 'exists:plans,id'],
            'subscription_status' => ['required', 'string', Rule::in(Tenant::ASSIGNABLE_STATUSES)],
            'subscription_expires_at' => ['nullable', 'string'],
        ]);

        $tenant = TenantManager::runWithoutScope(function () use ($data) {
            $defaultPlan = Plan::first() ?? Plan::create(['name' => 'Langganan 1 Tahun', 'price' => 5_000_000_00]);
            $planId = ! empty($data['plan_id']) ? (int) $data['plan_id'] : $defaultPlan->id;
            $expiresAt = $this->parseDateInput($data['subscription_expires_at'] ?? null);

            if (! $expiresAt) {
                $expiresAt = $data['subscription_status'] === Tenant::STATUS_ACTIVE
                    ? Carbon::now()->addYear()->endOfDay()
                    : Carbon::now()->addDays(30)->endOfDay();
            }

            return Tenant::create([
                'company_name' => $data['company_name'],
                'slug' => $data['slug'],
                'plan_id' => $planId,
                'subscription_status' => $data['subscription_status'],
                'subscription_expires_at' => $expiresAt,
            ]);
        });

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'tenant.created',
            'target_type' => Tenant::class,
            'target_id' => $tenant->id,
            'metadata' => [
                'company_name' => $tenant->company_name,
                'slug' => $tenant->slug,
                'plan_id' => $tenant->plan_id,
            ],
        ]);

        return redirect()->route('superpowers.tenants.show', $tenant->id)
            ->with('success', 'Tenant berhasil dibuat.');
    }

    public function show(Request $request, Tenant $tenant, TenantAnalyticsService $analyticsService)
    {
        $tenant->load('plan');

        $users = TenantManager::runWithoutScope(function () use ($tenant) {
            return User::where('tenant_id', $tenant->id)
                ->orderBy('created_at', 'desc')
                ->paginate(30)
                ->through(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role_name,
                    'created_at' => $user->created_at?->toIso8601String(),
                ]);
        });

        $analytics = $analyticsService->forTenant($tenant);

        return Inertia::render('Superpowers/Tenants/Show', [
            'tenant' => [
                'id' => $tenant->id,
                'company_name' => $tenant->company_name,
                'slug' => $tenant->slug,
                'subscription_status' => $tenant->subscription_status,
                'subscription_expires_at' => $tenant->subscription_expires_at?->toDateString(),
                'plan' => $tenant->plan ? [
                    'id' => $tenant->plan->id,
                    'name' => $tenant->plan->name,
                    'price_cents' => $tenant->plan->price,
                ] : null,
                'deleted_at' => $tenant->deleted_at?->toIso8601String(),
                'created_at' => $tenant->created_at?->toIso8601String(),
                'updated_at' => $tenant->updated_at?->toIso8601String(),
            ],
            'users' => $users,
            'analytics' => $analytics,
        ]);
    }

    public function edit(Request $request, Tenant $tenant)
    {
        $plans = TenantManager::runWithoutScope(
            fn () => Plan::orderBy('price')->get(['id', 'name', 'price'])
        );

        $tenant->load('plan');

        return Inertia::render('Superpowers/Tenants/Edit', [
            'tenant' => [
                'id' => $tenant->id,
                'company_name' => $tenant->company_name,
                'slug' => $tenant->slug,
                'subscription_status' => $tenant->subscription_status,
                'subscription_expires_at' => $tenant->subscription_expires_at?->format('d/m/Y'),
                'plan_id' => $tenant->plan_id,
            ],
            'plans' => $plans,
        ]);
    }

    public function update(Request $request, Tenant $tenant)
    {
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9-]+$/', Rule::unique('tenants', 'slug')->ignore($tenant->id)],
            'plan_id' => ['nullable', 'exists:plans,id'],
            'subscription_status' => ['required', 'string', Rule::in(Tenant::ASSIGNABLE_STATUSES)],
            'subscription_expires_at' => ['nullable', 'string'],
        ]);

        TenantManager::runWithoutScope(function () use ($tenant, $data) {
            $defaultPlan = Plan::first() ?? Plan::create(['name' => 'Langganan 1 Tahun', 'price' => 5_000_000_00]);
            $planId = ! empty($data['plan_id']) ? (int) $data['plan_id'] : ($tenant->plan_id ?: $defaultPlan->id);
            $expiresAt = $this->parseDateInput($data['subscription_expires_at'] ?? null);

            $tenant->update([
                'company_name' => $data['company_name'],
                'slug' => $data['slug'],
                'plan_id' => $planId,
                'subscription_status' => $data['subscription_status'],
                'subscription_expires_at' => $expiresAt ?? $tenant->subscription_expires_at,
            ]);
        });

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'tenant.updated',
            'target_type' => Tenant::class,
            'target_id' => $tenant->id,
            'metadata' => $data,
        ]);

        return redirect()->route('superpowers.tenants.show', $tenant->id)
            ->with('success', 'Tenant berhasil diperbarui.');
    }

    public function destroy(Request $request, Tenant $tenant)
    {
        TenantManager::runWithoutScope(fn () => $tenant->delete());

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'tenant.deleted',
            'target_type' => Tenant::class,
            'target_id' => $tenant->id,
            'metadata' => [
                'company_name' => $tenant->company_name,
                'slug' => $tenant->slug,
            ],
        ]);

        return redirect()->route('superpowers.tenants.index')
            ->with('success', 'Tenant berhasil dihapus (soft delete).');
    }

    public function suspend(Request $request, Tenant $tenant)
    {
        TenantManager::runWithoutScope(function () use ($tenant) {
            $tenant->update(['subscription_status' => Tenant::STATUS_READONLY]);
        });

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'tenant.suspended',
            'target_type' => Tenant::class,
            'target_id' => $tenant->id,
            'metadata' => [
                'company_name' => $tenant->company_name,
            ],
        ]);

        return redirect()->route('superpowers.tenants.show', $tenant->id)
            ->with('success', 'Tenant telah disuspend (mode readonly).');
    }

    public function activate(Request $request, Tenant $tenant)
    {
        TenantManager::runWithoutScope(function () use ($tenant) {
            $tenant->update(['subscription_status' => Tenant::STATUS_ACTIVE]);
        });

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'tenant.activated',
            'target_type' => Tenant::class,
            'target_id' => $tenant->id,
            'metadata' => [
                'company_name' => $tenant->company_name,
            ],
        ]);

        return redirect()->route('superpowers.tenants.show', $tenant->id)
            ->with('success', 'Tenant telah diaktifkan kembali.');
    }

    public function restore(Request $request, int $tenant)
    {
        $restored = TenantManager::runWithoutScope(
            fn () => Tenant::withTrashed()->where('id', $tenant)->restore()
        );

        if (! $restored) {
            return redirect()->route('superpowers.tenants.index')
                ->with('error', 'Tenant tidak ditemukan atau sudah dipulihkan.');
        }

        $tenantModel = TenantManager::runWithoutScope(
            fn () => Tenant::withTrashed()->find($tenant)
        );

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'tenant.restored',
            'target_type' => Tenant::class,
            'target_id' => $tenant,
            'metadata' => [
                'company_name' => $tenantModel?->company_name,
            ],
        ]);

        return redirect()->route('superpowers.tenants.show', $tenant)
            ->with('success', 'Tenant berhasil dipulihkan.');
    }

    protected function parseDateInput(?string $value): ?Carbon
    {
        if (empty($value)) {
            return null;
        }

        $trimmed = trim($value);
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $trimmed)) {
            return Carbon::createFromFormat('d/m/Y', $trimmed)->endOfDay();
        }

        try {
            return Carbon::parse($trimmed)->endOfDay();
        } catch (\Throwable) {
            return null;
        }
    }
}
