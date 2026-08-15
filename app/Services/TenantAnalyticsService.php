<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Alert;
use App\Models\DoItem;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\TenantStageTemplate;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TenantAnalyticsService
{
    /**
     * Compile platform-wide developer and SaaS analytics for the Superpowers dashboard.
     */
    public function forPlatform(): array
    {
        return TenantManager::runWithoutScope(function () {
            $activeTenants = Tenant::query()->activeSubscription();
            $now = Carbon::now();
            $oneDayAgo = $now->copy()->subDay();

            // Total MRR from active plans
            $mrrCents = (int) (clone $activeTenants)
                ->join('plans', 'plans.id', '=', 'tenants.plan_id')
                ->sum('plans.price');

            // Platform activity logs volume in last 24h
            $platformActivity24h = ActivityLog::where('created_at', '>=', $oneDayAgo)->count();

            // Active users in last 24h across all tenants
            $activeUsers24h = ActivityLog::where('created_at', '>=', $oneDayAgo)
                ->whereNotNull('user_id')
                ->distinct('user_id')
                ->count('user_id');

            // Invoices pending manual verification by superadmin
            $pendingInvoicesCount = SubscriptionInvoice::where('status', SubscriptionInvoice::STATUS_PENDING_VERIFICATION)->count();

            // Total DB records across tenant tables (resource footprint)
            $totalDbRecords = (
                Item::count() +
                ItemProgress::count() +
                Po::count() +
                Alert::count() +
                User::count() +
                ActivityLog::count() +
                DoItem::count()
            );

            return [
                'tenants_total' => Tenant::withTrashed()->count(),
                'tenants_active' => (clone $activeTenants)->count(),
                'tenants_readonly' => Tenant::query()->readonlySubscription()->count(),
                'tenants_deleted' => Tenant::onlyTrashed()->count(),
                'users_total' => User::count(),
                'active_users_24h' => $activeUsers24h,
                'activity_24h' => $platformActivity24h,
                'total_db_records' => $totalDbRecords,
                'mrr_cents' => $mrrCents,
                'pending_invoices_count' => $pendingInvoicesCount,
            ];
        });
    }

    /**
     * Compile deep-dive developer & SaaS analytics for a single tenant.
     */
    public function forTenant(Tenant $tenant): array
    {
        return TenantManager::runWithoutScope(function () use ($tenant) {
            $tenantId = $tenant->id;
            $now = Carbon::now();
            $oneDayAgo = $now->copy()->subDay();
            $thirtyDaysAgo = $now->copy()->subDays(30);

            // 1. Engagement & Activity
            $dau = ActivityLog::where('tenant_id', $tenantId)
                ->where('created_at', '>=', $oneDayAgo)
                ->whereNotNull('user_id')
                ->distinct('user_id')
                ->count('user_id');

            $mau = ActivityLog::where('tenant_id', $tenantId)
                ->where('created_at', '>=', $thirtyDaysAgo)
                ->whereNotNull('user_id')
                ->distinct('user_id')
                ->count('user_id');

            $lastLog = ActivityLog::where('tenant_id', $tenantId)
                ->latest('created_at')
                ->first();

            $lastActiveAt = $lastLog?->created_at?->toIso8601String();

            $activity30d = ActivityLog::where('tenant_id', $tenantId)
                ->where('created_at', '>=', $thirtyDaysAgo)
                ->count();

            // Floor vs Office user activity split
            $floorRoles = ['DRAFTER', 'PURCHASING', 'MACHINING', 'FABRICATION', 'PRODUCTION', 'QC', 'DELIVERY', 'STAFF'];
            $officeRoles = ['FINANCE', 'ADMIN', 'MANAGER', 'OWNER', 'SALES'];

            $floorActivity30d = ActivityLog::where('activity_logs.tenant_id', $tenantId)
                ->where('activity_logs.created_at', '>=', $thirtyDaysAgo)
                ->join('users', 'users.id', '=', 'activity_logs.user_id')
                ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
                ->where('roles.level', 'production')
                ->count();

            $officeActivity30d = ActivityLog::where('activity_logs.tenant_id', $tenantId)
                ->where('activity_logs.created_at', '>=', $thirtyDaysAgo)
                ->join('users', 'users.id', '=', 'activity_logs.user_id')
                ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
                ->where(function ($q) {
                    $q->where('roles.level', 'office')
                        ->orWhere('users.is_owner', true);
                })
                ->count();

            // Engagement status evaluation
            $engagementStatus = 'dormant';
            if ($lastLog && $lastLog->created_at->diffInDays($now) <= 3) {
                $engagementStatus = 'active';
            } elseif ($lastLog && $lastLog->created_at->diffInDays($now) <= 14) {
                $engagementStatus = 'idle';
            }

            // 2. Resource & Data Footprint
            $tableCounts = [
                'users' => User::where('tenant_id', $tenantId)->count(),
                'pos' => Po::where('tenant_id', $tenantId)->count(),
                'items' => Item::where('tenant_id', $tenantId)->count(),
                'item_progress' => ItemProgress::where('tenant_id', $tenantId)->count(),
                'alerts' => Alert::where('tenant_id', $tenantId)->count(),
                'activity_logs' => ActivityLog::where('tenant_id', $tenantId)->count(),
                'do_items' => DoItem::where('tenant_id', $tenantId)->count(),
                'templates' => TenantStageTemplate::where('tenant_id', $tenantId)->count(),
            ];

            $totalRecords = array_sum($tableCounts);

            // 3. Subscription & Invoices
            $recentInvoices = SubscriptionInvoice::with('paymentMethod')
                ->where('tenant_id', $tenantId)
                ->orderByDesc('id')
                ->take(5)
                ->get()
                ->map(fn ($inv) => [
                    'id' => $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'amount_cents' => $inv->amount_cents,
                    'status' => $inv->status,
                    'payment_method_name' => $inv->paymentMethod?->name,
                    'due_date' => $inv->due_date?->toDateString(),
                    'paid_at' => $inv->paid_at?->toIso8601String(),
                    'created_at' => $inv->created_at?->toIso8601String(),
                ]);

            return [
                'engagement' => [
                    'dau' => $dau,
                    'mau' => $mau,
                    'last_active_at' => $lastActiveAt,
                    'activity_count_30d' => $activity30d,
                    'floor_activity_30d' => $floorActivity30d,
                    'office_activity_30d' => $officeActivity30d,
                    'status' => $engagementStatus, // 'active' | 'idle' | 'dormant'
                ],
                'resources' => [
                    'total_records' => $totalRecords,
                    'table_breakdown' => $tableCounts,
                    'audit_logs_count' => $tableCounts['activity_logs'],
                    'users_count' => $tableCounts['users'],
                ],
                'billing' => [
                    'subscription_status' => $tenant->subscription_status,
                    'subscription_expires_at' => $tenant->subscription_expires_at?->toIso8601String(),
                    'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
                    'recent_invoices' => $recentInvoices,
                ],
            ];
        });
    }
}
