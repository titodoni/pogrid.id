<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Owns worker-facing read queries and dashboard aggregation.
 *
 * Pure move from WorkerDashboardController. No authz, no state change.
 */
class WorkerReportingService
{
    /**
     * @return array{items: Collection, auth_user: User, tenant: Tenant}
     */
    public function dashboard(string $slug, User $user, Tenant $tenant): array
    {
        $roleName = strtoupper($user->role_name);

        $query = Item::with([
            'itemProgresses',
            'po',
            'alerts' => function ($q) {
                $q->where('is_resolved', false);
            },
        ])
            ->join('pos', 'items.po_id', '=', 'pos.id')
            ->select('items.*')
            ->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty')
            ->orderBy('items.is_urgent', 'desc')
            ->orderBy('pos.is_urgent', 'desc')
            ->orderBy('pos.global_deadline', 'asc');

        if ($roleName === 'FINANCE') {
            $query->where(function ($q) {
                $q->whereNotIn('items.status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
                    ->orWhere(function ($sub) {
                        $sub->where('items.status', 'COMPLETED')
                            ->where(function ($subFinance) {
                                $subFinance->where('items.invoice_status', '!=', 'INVOICED')
                                    ->orWhere('items.payment_status', '!=', 'PAID');
                            });
                    });
            });
        } else {
            $query->whereNotIn('items.status', ['COMPLETED', 'CANCELLED', 'TERMINATED']);
        }

        return [
            'items' => $query->get(),
            'auth_user' => $user,
            'tenant' => $tenant,
        ];
    }

    /**
     * @return array{items: Collection, auth_user: User, tenant: Tenant}
     */
    public function archive(User $user, Tenant $tenant): array
    {
        $roleName = strtoupper($user->role_name);

        $query = Item::with([
            'itemProgresses',
            'po',
            'alerts' => fn ($q) => $q->where('is_resolved', false),
        ])->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty');

        match ($roleName) {
            'DRAFTER' => $query->whereHas('itemProgresses', fn ($q) => $q
                ->where(fn ($sub) => $sub
                    ->where('stage_name', 'like', '%Design%')
                    ->orWhere('stage_name', 'like', '%Gambar%')
                    ->orWhere('stage_name', 'like', '%Draft%')
                )->where('status', 'COMPLETED')
            ),
            'PURCHASING' => $query->whereHas('itemProgresses', fn ($q) => $q
                ->where(fn ($sub) => $sub
                    ->where('stage_name', 'like', '%Material%')
                    ->orWhere('stage_name', 'like', '%Bahan%')
                    ->orWhere('stage_name', 'like', '%Vendor%')
                    ->orWhere('stage_name', 'like', '%Purchasing%')
                )->where('status', 'COMPLETED')
            ),
            'MACHINING', 'CNC' => $query->whereHas('itemProgresses', fn ($q) => $q
                ->where(fn ($sub) => $sub
                    ->where('stage_name', 'like', '%Machining%')
                    ->orWhere('stage_name', 'like', '%CNC%')
                )->where('status', 'COMPLETED')
            ),
            'FABRICATION' => $query->whereHas('itemProgresses', fn ($q) => $q
                ->where(fn ($sub) => $sub
                    ->where('stage_name', 'like', '%Fabrication%')
                    ->orWhere('stage_name', 'like', '%Fabrikasi%')
                )->where('status', 'COMPLETED')
            ),
            'ASSEMBLY' => $query->whereHas('itemProgresses', fn ($q) => $q
                ->where(fn ($sub) => $sub
                    ->where('stage_name', 'like', '%Assembly%')
                    ->orWhere('stage_name', 'like', '%Perakitan%')
                    ->orWhere('stage_name', 'like', '%Rakit%')
                    ->orWhere('stage_name', 'like', '%Fitting%')
                )->where('status', 'COMPLETED')
            ),
            'SURFACE' => $query->whereHas('itemProgresses', fn ($q) => $q
                ->where(fn ($sub) => $sub
                    ->where('stage_name', 'like', '%Surface%')
                    ->orWhere('stage_name', 'like', '%Painting%')
                    ->orWhere('stage_name', 'like', '%Coating%')
                    ->orWhere('stage_name', 'like', '%Finishing%')
                )->where('status', 'COMPLETED')
            ),
            'QC' => $query->whereHas('itemProgresses', fn ($q) => $q
                ->where('stage_name', 'QC')->where('status', 'COMPLETED')
            ),
            'DELIVERY' => $query->where('delivery_status', 'DELIVERED'),
            'FINANCE' => $query->where('payment_status', 'PAID'),
            'PRODUCTION' => $query->whereHas('itemProgresses', fn ($q) => $q
                ->where(fn ($sub) => $sub
                    ->where('stage_name', 'like', '%Machining%')
                    ->orWhere('stage_name', 'like', '%CNC%')
                    ->orWhere('stage_name', 'like', '%Fabrication%')
                    ->orWhere('stage_name', 'like', '%Fabrikasi%')
                )->where('status', 'COMPLETED')
            ),
            default => $query->whereRaw('1 = 0'),
        };

        return [
            'items' => $query->orderBy('updated_at', 'desc')->get(),
            'auth_user' => $user,
            'tenant' => $tenant,
        ];
    }

    /**
     * @return array{completed_stages: Collection, summary: array<string, mixed>, stage_breakdown: Collection, monthly_trend: Collection, auth_user: User, tenant: Tenant}
     */
    public function myKpi(User $user, Tenant $tenant): array
    {
        $roleName = strtoupper($user->role_name);

        $matchingStageNames = [];
        foreach (config('workflow.stage_role_map') as $entry) {
            if (in_array($roleName, $entry['roles'])) {
                $matchingStageNames = array_merge($matchingStageNames, $entry['keywords']);
            }
        }

        if ($roleName === 'PRODUCTION' || empty($matchingStageNames)) {
            foreach (config('workflow.stage_role_map') as $entry) {
                if (in_array('PRODUCTION', $entry['roles']) || $roleName === 'PRODUCTION') {
                    $matchingStageNames = array_merge($matchingStageNames, $entry['keywords']);
                }
            }
            $matchingStageNames = array_unique($matchingStageNames);
        }

        $stageKeywords = array_unique($matchingStageNames);

        $completedProgresses = ItemProgress::where('status', 'COMPLETED')
            ->where(function ($q) use ($stageKeywords) {
                foreach ($stageKeywords as $keyword) {
                    $q->orWhere('stage_name', 'like', "%{$keyword}%");
                }
            })
            ->with(['item' => function ($q) {
                $q->with('po:id,po_number,client_name,global_deadline');
            }])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($progress) {
                $created = $progress->created_at ? Carbon::parse($progress->created_at) : null;
                $completed = $progress->updated_at ? Carbon::parse($progress->updated_at) : null;
                $cycleDays = ($created && $completed) ? round(max(0, $created->diffInDays($completed)), 1) : null;

                return [
                    'id' => $progress->id,
                    'stage_name' => $progress->stage_name,
                    'completed_qty' => $progress->completed_qty,
                    'progress_percent' => (float) $progress->progress_percent,
                    'cycle_days' => $cycleDays,
                    'completed_at' => $progress->updated_at?->toISOString(),
                    'created_at' => $progress->created_at?->toISOString(),
                    'item' => $progress->item ? [
                        'id' => $progress->item->id,
                        'item_name' => $progress->item->item_name,
                        'target_qty' => $progress->item->target_qty,
                        'po_number' => $progress->item->po?->po_number ?? '-',
                        'client_name' => $progress->item->po?->client_name ?? '-',
                    ] : null,
                ];
            });

        $cycleDays = $completedProgresses->pluck('cycle_days')->filter()->values();
        $avgCycleDays = $cycleDays->count() > 0 ? round($cycleDays->avg(), 1) : 0;
        $maxCycleDays = $cycleDays->count() > 0 ? $cycleDays->max() : 0;
        $minCycleDays = $cycleDays->count() > 0 ? $cycleDays->min() : 0;

        $stageCounts = $completedProgresses->groupBy('stage_name')
            ->map(fn ($stages, $name) => [
                'stage' => $name,
                'count' => $stages->count(),
                'avg_cycle_days' => round($stages->pluck('cycle_days')->filter()->avg() ?? 0, 1),
            ])
            ->sortByDesc('count')
            ->values();

        $monthlyCompletion = $completedProgresses->groupBy(function ($p) {
            return $p['completed_at'] ? substr($p['completed_at'], 0, 7) : 'unknown';
        })
            ->map(fn ($items, $month) => [
                'month' => $month,
                'count' => $items->count(),
            ])
            ->sortBy('month')
            ->values();

        return [
            'completed_stages' => $completedProgresses,
            'summary' => [
                'total_completed' => $completedProgresses->count(),
                'avg_cycle_days' => $avgCycleDays,
                'fastest_cycle_days' => $minCycleDays,
                'slowest_cycle_days' => $maxCycleDays,
            ],
            'stage_breakdown' => $stageCounts,
            'monthly_trend' => $monthlyCompletion,
            'auth_user' => $user,
            'tenant' => $tenant,
        ];
    }

    /**
     * @return array{alerts: Collection, auth_user: User, tenant: Tenant}
     */
    public function troubleReports(User $user, Tenant $tenant): array
    {
        $query = Alert::with(['item.po'])->orderBy('created_at', 'desc');

        $user->loadMissing('roleRelation');
        if ($user->role_level !== 'office' && strcasecmp($user->role_name, 'PPIC') !== 0) {
            $query->where('severity', '!=', 'BLUE');
        }

        return [
            'alerts' => $query->get(),
            'auth_user' => $user,
            'tenant' => $tenant,
        ];
    }

    /**
     * @return array{pos: Collection, auth_user: User, tenant: Tenant}
     */
    public function financeLedger(User $user, Tenant $tenant): array
    {
        $pos = Po::with([
            'items' => function ($q) {
                $q->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty')
                    ->with(['itemProgresses']);
            },
        ])->orderBy('created_at', 'desc')->get();

        return [
            'pos' => $pos,
            'auth_user' => $user,
            'tenant' => $tenant,
        ];
    }
}
