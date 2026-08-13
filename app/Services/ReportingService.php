<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Alert;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * Owns read-only dashboard reporting queries and aggregation.
 *
 * Complements TelemetryService (KPI/OTD ranges) with the rework deep-dive and
 * the activity-log feed. Logic here is a verbatim move from
 * OwnerDashboardController — no rule changes.
 */
class ReportingService
{
    /**
     * Rework logbook: events, KPI summary, trend and breakdowns.
     *
     * @param  string  $range  one of week|month|year|all
     * @return array{rework_events: Collection, summary: array<string, mixed>}
     */
    public function reworkLogbook(string $range): array
    {
        $allRework = Alert::where('reason_type', 'QC Rework')
            ->with([
                'item:id,item_name,target_qty,status,po_id,progress_percent',
                'item.po:id,po_number,client_name,global_deadline',
                'user:id,name',
            ]);

        if ($range !== 'all') {
            [$startDate, $endDate] = match ($range) {
                'week' => [now()->subDays(6)->startOfDay(), now()->endOfDay()],
                'year' => [now()->subDays(364)->startOfDay(), now()->endOfDay()],
                default => [now()->subDays(29)->startOfDay(), now()->endOfDay()],
            };
            $allRework->whereBetween('created_at', [$startDate, $endDate]);
        }

        $reworkEvents = $allRework->latest()->get();

        $totalReworkQty = 0;
        $resolvedCount = 0;
        $clientRework = [];
        $itemRework = [];
        $trendBuckets = [];

        foreach ($reworkEvents as $event) {
            preg_match('/QC Rework: (\d+)/', $event->message, $m);
            $qty = (int) ($m[1] ?? 1);
            $totalReworkQty += $qty;
            if ($event->is_resolved) {
                $resolvedCount++;
            }

            $cn = $event->item?->po?->client_name ?? 'Unknown';
            $clientRework[$cn] = ($clientRework[$cn] ?? ['events' => 0, 'qty' => 0]);
            $clientRework[$cn]['events']++;
            $clientRework[$cn]['qty'] += $qty;

            $in = $event->item?->item_name ?? 'Unknown';
            $itemRework[$in] = ($itemRework[$in] ?? ['events' => 0, 'qty' => 0]);
            $itemRework[$in]['events']++;
            $itemRework[$in]['qty'] += $qty;

            $monthKey = $event->created_at?->format('Y-m') ?? 'unknown';
            $trendBuckets[$monthKey] = ($trendBuckets[$monthKey] ?? ['events' => 0, 'qty' => 0]);
            $trendBuckets[$monthKey]['events']++;
            $trendBuckets[$monthKey]['qty'] += $qty;
        }

        $stages = ItemProgress::where('stage_name', 'like', '%REWORK%')
            ->with('item:id,item_name,po_id')
            ->get();

        $stageReworkCounts = [];
        foreach ($stages as $s) {
            $baseStage = preg_replace('/\s*-\s*REWORK/i', '', $s->stage_name);
            $stageReworkCounts[$baseStage] = ($stageReworkCounts[$baseStage] ?? 0) + 1;
        }
        arsort($stageReworkCounts);
        $topReworkedStages = array_slice($stageReworkCounts, 0, 5, true);

        $monthlyTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = now()->subMonths($i);
            $key = $m->format('Y-m');
            $label = $m->format('M Y');
            $bucket = $trendBuckets[$key] ?? ['events' => 0, 'qty' => 0];
            $monthlyTrend[] = [
                'label' => $label,
                'month' => $key,
                'events' => $bucket['events'],
                'qty' => $bucket['qty'],
            ];
        }

        $inspectedItems = Item::whereHas('itemProgresses', fn ($q) => $q
            ->where('stage_name', 'QC')
            ->where('status', 'COMPLETED')
        )->count();
        $inspectedItems = max($inspectedItems, 1);
        $reworkRatePct = round(($reworkEvents->count() / $inspectedItems) * 100, 1);

        uasort($clientRework, fn ($a, $b) => $b['events'] <=> $a['events']);
        uasort($itemRework, fn ($a, $b) => $b['events'] <=> $a['events']);

        return [
            'rework_events' => $reworkEvents->map(function ($alert) {
                preg_match('/QC Rework: (\d+)/', $alert->message, $m);
                $rejectQty = (int) ($m[1] ?? 1);

                preg_match("/stage '([^']+)'/", $alert->message, $sm);
                $stage = $sm[1] ?? 'QC';

                return [
                    'id' => $alert->id,
                    'reject_qty' => $rejectQty,
                    'stage' => $stage,
                    'is_resolved' => $alert->is_resolved,
                    'created_at' => $alert->created_at?->toISOString(),
                    'rework_reason' => $alert->rework_reason,
                    'item' => $alert->item ? [
                        'id' => $alert->item->id,
                        'item_name' => $alert->item->item_name,
                        'target_qty' => $alert->item->target_qty,
                        'status' => $alert->item->status,
                        'progress_percent' => (float) $alert->item->progress_percent,
                        'po' => $alert->item->po ? [
                            'po_number' => $alert->item->po->po_number,
                            'client_name' => $alert->item->po->client_name,
                            'global_deadline' => $alert->item->po->global_deadline?->toDateString(),
                        ] : null,
                    ] : null,
                    'user' => $alert->user ? [
                        'name' => $alert->user->name,
                    ] : null,
                ];
            }),
            'summary' => [
                'total_events' => $reworkEvents->count(),
                'total_rework_qty' => $totalReworkQty,
                'resolved_count' => $resolvedCount,
                'unresolved_count' => $reworkEvents->count() - $resolvedCount,
                'rework_rate_pct' => $reworkRatePct,
                'inspected_items' => $inspectedItems,
                'top_stages' => collect($topReworkedStages)->map(fn ($count, $stage) => [
                    'stage' => $stage,
                    'count' => $count,
                ])->values(),
                'monthly_trend' => $monthlyTrend,
                'client_breakdown' => collect($clientRework)->map(fn ($d, $name) => [
                    'client_name' => $name,
                    'events' => $d['events'],
                    'qty' => $d['qty'],
                ])->values(),
                'item_breakdown' => collect($itemRework)->map(fn ($d, $name) => [
                    'item_name' => $name,
                    'events' => $d['events'],
                    'qty' => $d['qty'],
                ])->values(),
            ],
        ];
    }

    /**
     * Paginated activity log feed plus the project filter options.
     *
     * @return array{logs: LengthAwarePaginator, projects: Collection}
     */
    public function activityLogs(?int $projectFilter): array
    {
        $query = ActivityLog::query()
            ->with(['project:id,po_number,client_name', 'item:id,item_name', 'user:id,name'])
            ->latest('created_at');

        if ($projectFilter) {
            $query->where('project_id', $projectFilter);
        }

        return [
            'logs' => $query->paginate(50)->withQueryString(),
            'projects' => Po::query()
                ->orderBy('po_number')
                ->get(['id', 'po_number', 'client_name']),
        ];
    }
}
