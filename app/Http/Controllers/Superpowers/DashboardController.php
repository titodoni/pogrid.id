<?php

namespace App\Http\Controllers\Superpowers;

use App\Http\Controllers\Controller;
use App\Models\EmailLog;
use App\Models\PlatformActivityLog;
use App\Models\Tenant;
use App\Services\TenantAnalyticsService;
use App\Services\TenantManager;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(TenantAnalyticsService $analyticsService)
    {
        $stats = $analyticsService->forPlatform();

        $emails = TenantManager::runWithoutScope(fn () => [
            'sent_24h' => EmailLog::where('status', EmailLog::STATUS_SENT)
                ->where('created_at', '>=', now()->subDay())->count(),
            'failed_24h' => EmailLog::where('status', EmailLog::STATUS_FAILED)
                ->where('created_at', '>=', now()->subDay())->count(),
        ]);

        $recentActivity = PlatformActivityLog::with('platformAdmin:id,name')
            ->latest('created_at')
            ->take(15)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'action' => $log->action,
                'target_type' => $log->target_type,
                'target_id' => $log->target_id,
                'metadata' => $log->metadata,
                'admin_name' => $log->platformAdmin?->name,
                'created_at' => $log->created_at?->toIso8601String(),
            ]);

        $recentTenants = TenantManager::runWithoutScope(
            fn () => Tenant::with('plan')->latest('id')->take(5)->get()->map(fn ($t) => [
                'id' => $t->id,
                'company_name' => $t->company_name,
                'slug' => $t->slug,
                'subscription_status' => $t->subscription_status,
                'plan_name' => $t->plan?->name,
                'created_at' => $t->created_at?->toIso8601String(),
            ])
        );

        return Inertia::render('Superpowers/Dashboard', [
            'stats' => $stats,
            'emails' => $emails,
            'queue_size' => $this->queueSize(),
            'failed_jobs' => $this->failedJobCount(),
            'recent_activity' => $recentActivity,
            'recent_tenants' => $recentTenants,
        ]);
    }

    protected function queueSize(): int
    {
        try {
            return (int) DB::table('jobs')->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    protected function failedJobCount(): int
    {
        try {
            return (int) DB::table('failed_jobs')->count();
        } catch (\Throwable) {
            return 0;
        }
    }
}
