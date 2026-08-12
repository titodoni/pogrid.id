<?php

namespace App\Http\Controllers;

use App\Events\KendalaReported;
use App\Events\QcReworkLogged;
use App\Events\TaskUpdated;
use App\Models\Alert;
use App\Models\DeliveryOrder;
use App\Models\DoItem;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Post;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Writer;

class WorkerDashboardController extends Controller
{
    private const STAGE_ROLE_MAP = [
        'design' => ['DRAFTER'],
        'gambar' => ['DRAFTER'],
        'draft' => ['DRAFTER'],
        'material' => ['PURCHASING'],
        'bahan' => ['PURCHASING'],
        'vendor' => ['PURCHASING'],
        'purchasing' => ['PURCHASING'],
        'machining' => ['MACHINING', 'CNC', 'PRODUCTION'],
        'cnc' => ['MACHINING', 'CNC', 'PRODUCTION'],
        'fabrication' => ['FABRICATION', 'PRODUCTION'],
        'fabrikasi' => ['FABRICATION', 'PRODUCTION'],
        'qc' => ['QC'],
        'delivery' => ['DELIVERY'],
        'pengiriman' => ['DELIVERY'],
        'assembly' => ['ASSEMBLY'],
        'perakitan' => ['ASSEMBLY'],
        'rakit' => ['ASSEMBLY'],
        'fitting' => ['ASSEMBLY'],
        'fitter' => ['ASSEMBLY'],
        'erection' => ['ASSEMBLY'],
        'surface' => ['SURFACE'],
        'heat treatment' => ['SURFACE'],
        'powder coating' => ['SURFACE'],
        'painting' => ['SURFACE'],
        'cat' => ['SURFACE'],
        'galvanizing' => ['SURFACE'],
        'galvanis' => ['SURFACE'],
        'plating' => ['SURFACE'],
        'anodizing' => ['SURFACE'],
        'sandblasting' => ['SURFACE'],
        'electroplating' => ['SURFACE'],
        'finishing' => ['SURFACE'],
        'coating' => ['SURFACE'],
        'maintenance' => ['MAINTENANCE'],
        'perawatan' => ['MAINTENANCE'],
        'repair' => ['MAINTENANCE'],
        'perbaikan' => ['MAINTENANCE'],
    ];

    public function index(Request $request, $slug)
    {
        // 1. Resolve tenant context by slug
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->first();
        if (! $tenant) {
            abort(404, 'Tenant not found.');
        }
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        // 2. If guest, render the unified login gateway
        if (! auth()->check()) {
            $workers = User::where('tenant_id', $tenant->id)
                ->whereNotNull('pin')
                ->with('roleRelation:id,name,display_name,display_name_id', 'postRelation:id,name,display_name,display_name_id')
                ->get(['id', 'name', 'role_id', 'post_id']);

            return Inertia::render('Worker/Login', [
                'tenant' => [
                    'id' => $tenant->id,
                    'company_name' => $tenant->company_name,
                    'slug' => $tenant->slug,
                    'logo_path' => $tenant->logo_path,
                    'theme' => $tenant->theme ?? 'theme-default',
                ],
                'workers' => $workers,
            ]);
        }

        // 3. Authenticated: verify tenant scope matching
        $user = auth()->user()->load('roleRelation', 'postRelation');
        \Illuminate\Support\Facades\Gate::authorize('view-tenant', $tenant->id);

        // 4. Determine dashboard views by office vs floor roles division
        if (strtoupper($user->role_name) === 'PPIC') {
            $ppicController = app(PpicDashboardController::class);

            return $ppicController->index($request, $slug);
        }

        if ($user->role_level === 'office') {
            $pos = Po::with([
                'items' => function ($q) {
                    $q->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty')
                        ->with(['itemProgresses', 'alerts.user']);
                },
            ])->get();
            $alerts = Alert::with(['item.po', 'user'])->where('is_resolved', false)->get();
            $users = User::with('roleRelation:id,name,display_name,display_name_id', 'postRelation:id,name,display_name,display_name_id')->get();
            $roles = Role::all(['id', 'name', 'display_name', 'display_name_id', 'level']);
            $posts = Post::all(['id', 'name', 'display_name', 'display_name_id']);

            $range = $request->input('range', 'month');
            if (! in_array($range, ['week', 'month', 'year'])) {
                $range = 'month';
            }
            $telemetry = $this->getTelemetryData($range);

            return Inertia::render('Owner/Dashboard', [
                'pos' => $pos,
                'alerts' => $alerts,
                'users' => $users,
                'roles' => $roles,
                'posts' => $posts,
                'tenant' => $tenant,
                'auth_user' => $user,
                'telemetry' => $telemetry,
                'selected_range' => $range,
            ]);
        }

        $roleName = strtoupper($user->role_name);

        // Otherwise, render floor operators dashboard
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

        $items = $query->get();

        return Inertia::render('Worker/Dashboard', [
            'items' => $items,
            'auth_user' => $user,
            'tenant_id' => $tenant->id,
            'tenant' => $tenant,
        ]);
    }

    public function archive(Request $request, $slug)
    {
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->first();
        if (! $tenant) {
            abort(404, 'Tenant not found.');
        }
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        if (! auth()->check()) {
            return redirect()->route('worker.dashboard', ['slug' => $slug]);
        }

        $user = auth()->user()->load('roleRelation', 'postRelation');
        \Illuminate\Support\Facades\Gate::authorize('view-tenant', $tenant->id);

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

        $items = $query->orderBy('updated_at', 'desc')->get();

        return Inertia::render('Worker/Archive', [
            'items' => $items,
            'auth_user' => $user,
            'tenant' => $tenant,
        ]);
    }

    public function myKpi(Request $request, $slug)
    {
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->first();
        if (! $tenant) {
            abort(404, 'Tenant not found.');
        }
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        if (! auth()->check()) {
            return redirect()->route('worker.dashboard', ['slug' => $slug]);
        }

        $user = auth()->user()->load('roleRelation', 'postRelation');
        \Illuminate\Support\Facades\Gate::authorize('view-tenant', $tenant->id);

        $roleName = strtoupper($user->role_name);

        $matchingStageNames = [];
        foreach (self::STAGE_ROLE_MAP as $keyword => $roles) {
            if (in_array($roleName, $roles)) {
                $matchingStageNames[] = $keyword;
            }
        }

        // PRODUCTION catch-all: if no explicit match, they can work with any non-QC/non-special stage
        if ($roleName === 'PRODUCTION' || empty($matchingStageNames)) {
            foreach (self::STAGE_ROLE_MAP as $keyword => $roles) {
                if (in_array('PRODUCTION', $roles) || $roleName === 'PRODUCTION') {
                    $matchingStageNames[] = $keyword;
                }
            }
            $matchingStageNames = array_unique($matchingStageNames);
        }

        // For roles without specific stages, show all their completed stages
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

        return Inertia::render('Worker/MyKpi', [
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
        ]);
    }

    public function exportPdf(Request $request, $slug, \App\Services\ExportService $exportService)
    {
        [$tenant] = $this->resolveTenantAuth($request, $slug);

        $range = $request->input('range', 'month');
        if (! in_array($range, ['week', 'month', 'year'])) {
            $range = 'month';
        }
        $telemetry = $this->getTelemetryData($range);

        return $exportService->exportPdf($tenant, $telemetry, $range);
    }

    public function exportCsv(Request $request, $slug, \App\Services\ExportService $exportService)
    {
        [$tenant] = $this->resolveTenantAuth($request, $slug);

        $range = $request->input('range', 'month');
        if (! in_array($range, ['week', 'month', 'year'])) {
            $range = 'month';
        }
        $telemetry = $this->getTelemetryData($range);

        return $exportService->exportCsv($telemetry, $range);
    }

    public function exportXlsx(Request $request, $slug, \App\Services\ExportService $exportService)
    {
        [$tenant] = $this->resolveTenantAuth($request, $slug);

        $range = $request->input('range', 'month');
        if (! in_array($range, ['week', 'month', 'year'])) {
            $range = 'month';
        }
        $telemetry = $this->getTelemetryData($range);

        return $exportService->exportXlsx($telemetry, $range);
    }

    private function resolveTenantAuth(Request $request, $slug): array
    {
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->first();
        if (! $tenant) {
            abort(404, 'Tenant not found.');
        }
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        if (! auth()->check()) {
            abort(401);
        }

        $user = auth()->user();
        \Illuminate\Support\Facades\Gate::authorize('view-tenant', $tenant->id);

        $user->load('roleRelation');
        \Illuminate\Support\Facades\Gate::authorize('access-office');

        return [$tenant];
    }

    private function getTelemetryData($range)
    {
        // ── Date range bounds ─────────────────────────────────────────────────
        [$startDate, $endDate] = $this->getRangeBounds($range);
        [$prevStartDate, $prevEndDate] = $this->getPreviousRangeBounds($range);

        // ── 1. On-Time Delivery Rate (OTDR) ──────────────────────────────────
        // Filter by global_deadline falling within the range (not created_at).
        // This means "Month" = POs that were *due* this month — the correct
        // question for a performance review.
        $otdr = $this->calcOtdr($startDate, $endDate);
        $prevOtdr = $this->calcOtdr($prevStartDate, $prevEndDate);

        // ── 2. Output Volumes ─────────────────────────────────────────────────
        // Migrated to native SQL to prevent OOM on large tenants.
        $deliveredManufacture = (float) \DB::table('do_items')
            ->join('items', 'do_items.item_id', '=', 'items.id')
            ->where('items.item_type', 'MANUFACTURE')
            ->whereNull('items.deleted_at')
            ->whereBetween('do_items.updated_at', [$startDate, $endDate])
            ->sum('do_items.delivered_qty');

        $targetManufacture = (int) Item::where('item_type', 'MANUFACTURE')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('target_qty');

        $outputBuyout = (float) Item::where('item_type', 'BUY_OUT')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum(\DB::raw('target_qty * (progress_percent / 100.0)'));
        
        $targetBuyout = (int) Item::where('item_type', 'BUY_OUT')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('target_qty');

        $outputService = (float) Item::where('item_type', 'SERVICE')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum(\DB::raw('target_qty * (progress_percent / 100.0)'));

        $targetService = (int) Item::where('item_type', 'SERVICE')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('target_qty');

        // Previous period manufacture for delta comparison
        $prevDeliveredManufacture = (float) \DB::table('do_items')
            ->join('items', 'do_items.item_id', '=', 'items.id')
            ->where('items.item_type', 'MANUFACTURE')
            ->whereNull('items.deleted_at')
            ->whereBetween('do_items.updated_at', [$prevStartDate, $prevEndDate])
            ->sum('do_items.delivered_qty');

        $prevTargetManufacture = (int) Item::where('item_type', 'MANUFACTURE')
            ->whereBetween('created_at', [$prevStartDate, $prevEndDate])
            ->sum('target_qty');

        // ── 3. Active Risks ───────────────────────────────────────────────────
        $unresolvedAlerts = Alert::where('is_resolved', false)->get();
        $redRisks = $unresolvedAlerts->where('severity', 'RED')->count();
        $yellowRisks = $unresolvedAlerts->where('severity', 'YELLOW')->count();

        // ── 4. Average Delay (in Days) ────────────────────────────────────────
        $avgDelayDays = $this->calcAvgDelay($startDate, $endDate);
        $prevAvgDelayDays = $this->calcAvgDelay($prevStartDate, $prevEndDate);

        // ── 5. Urgent POs count ───────────────────────────────────────────────
        $urgentActiveCount = Po::whereNotIn('status', ['COMPLETED', 'CANCELLED'])
            ->where('is_urgent', true)
            ->count();

        $delayedPosCount = Po::whereNotIn('status', ['COMPLETED', 'CANCELLED'])
            ->where('global_deadline', '<', now()->toDateString())
            ->count();

        // ── 6. Why Delayed Breakdown ──────────────────────────────────────────
        // Now uses reason_type enum column instead of keyword scanning.
        // Falls back to keyword scanning for legacy alerts without reason_type.
        $alertsInRange = Alert::where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate)
            ->get();

        $delayReasons = [
            'Machine Broken' => 0,
            'Material Delay' => 0,
            'QC Rework' => 0,
            'Power Outage' => 0,
            'Human Error' => 0,
            'Operator Sick' => 0,
            'Other' => 0,
        ];

        foreach ($alertsInRange as $alert) {
            if ($alert->reason_type) {
                // Structured path — accurate
                $key = match (true) {
                    str_contains($alert->reason_type, 'Machine') || str_contains($alert->reason_type, 'Mesin') => 'Machine Broken',
                    str_contains($alert->reason_type, 'Material') => 'Material Delay',
                    str_contains($alert->reason_type, 'Rework') || str_contains($alert->reason_type, 'QC') => 'QC Rework',
                    str_contains($alert->reason_type, 'Power') || str_contains($alert->reason_type, 'Listrik') => 'Power Outage',
                    str_contains($alert->reason_type, 'Human') || str_contains($alert->reason_type, 'Kesalahan') => 'Human Error',
                    str_contains($alert->reason_type, 'Sick') || str_contains($alert->reason_type, 'Sakit') => 'Operator Sick',
                    default => 'Other',
                };
                $delayReasons[$key]++;
            } else {
                // Legacy fallback — keyword scan for old alerts before migration
                $msg = strtolower($alert->message);
                if (str_contains($msg, 'machine') || str_contains($msg, 'mesin') || str_contains($msg, 'broken') || str_contains($msg, 'rusak')) {
                    $delayReasons['Machine Broken']++;
                } elseif (str_contains($msg, 'material') || str_contains($msg, 'bahan') || str_contains($msg, 'shortage') || str_contains($msg, 'habis') || str_contains($msg, 'vendor')) {
                    $delayReasons['Material Delay']++;
                } elseif (str_contains($msg, 'rework') || str_contains($msg, 'reject') || str_contains($msg, 'qc')) {
                    $delayReasons['QC Rework']++;
                } elseif (str_contains($msg, 'power') || str_contains($msg, 'listrik')) {
                    $delayReasons['Power Outage']++;
                } elseif (str_contains($msg, 'absent') || str_contains($msg, 'absen') || str_contains($msg, 'sakit') || str_contains($msg, 'sick')) {
                    $delayReasons['Operator Sick']++;
                } elseif (str_contains($msg, 'human') || str_contains($msg, 'error') || str_contains($msg, 'kesalahan')) {
                    $delayReasons['Human Error']++;
                } else {
                    $delayReasons['Other']++;
                }
            }
        }

        // ── 7. Production Trend Data ──────────────────────────────────────────
        $trendData = $this->buildTrendData($range);

        // ── 8. Bottleneck Stage Analyzer ──────────────────────────────────────
        $stageMapping = [
            'Drafter' => ['Design', 'Drafter', 'Drafting', 'Drawing', 'Gambar', 'Draft'],
            'Purchasing' => ['Material', 'Bahan', 'Purchasing', 'Vendor'],
            'Production' => ['Machining', 'Fabrication', 'CNC', 'Milling', 'Welder', 'Helper', 'Production', 'Fabrikasi'],
            'QC' => ['QC'],
            'Finance' => ['Delivery', 'Pengiriman', 'Finance', 'Billing'],
        ];

        $stageMetrics = [];
        foreach ($stageMapping as $targetStage => $sourceStages) {
            // Active items
            $activeCount = ItemProgress::whereIn('stage_name', $sourceStages)
                ->where('status', '!=', 'COMPLETED')
                ->count();

            // Stuck count
            $stuckCount = Alert::where('severity', 'RED')
                ->where(function ($q) use ($sourceStages) {
                    foreach ($sourceStages as $src) {
                        $q->orWhere('message', 'like', "%'{$src}'%");
                    }
                })
                ->count();

            // Rework count
            $reworkCount = Alert::where('severity', 'YELLOW')
                ->where(function ($q) use ($sourceStages) {
                    foreach ($sourceStages as $src) {
                        $q->orWhere('message', 'like', "%'{$src}'%");
                    }
                })
                ->count();

            // Completed stages average cycle time
            $completedStages = ItemProgress::whereIn('stage_name', $sourceStages)
                ->where('status', 'COMPLETED')
                ->whereBetween('updated_at', [$startDate, $endDate])
                ->get();

            $totalDays = 0.0;
            $completedCount = 0;
            foreach ($completedStages as $cs) {
                $created = Carbon::parse($cs->created_at);
                $updated = Carbon::parse($cs->updated_at);
                $totalDays += abs($updated->diffInHours($created)) / 24.0;
                $completedCount++;
            }
            $avgCycleTime = $completedCount > 0 ? round($totalDays / $completedCount, 2) : 0.00;

            $stageMetrics[] = [
                'stage' => $targetStage,
                'active_items' => $activeCount,
                'stuck_count' => $stuckCount,
                'rework_count' => $reworkCount,
                'avg_cycle_time' => $avgCycleTime,
            ];
        }

        // ── 9. Active Delayed & Stuck Items Directory ─────────────────────────
        $delayedItemsData = [];
        $allItemsData = [];
        $activeItems = Item::whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
            ->with(['po', 'itemProgresses', 'alerts'])
            ->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty')
            ->get();

        foreach ($activeItems as $item) {
            $po = $item->po;
            if (! $po) {
                continue;
            }

            $deadline = Carbon::parse($po->global_deadline)->startOfDay();
            $isOverdue = now()->startOfDay()->gt($deadline);

            $stuckProgress = $item->itemProgresses->firstWhere('status', 'STUCK');
            $stuckAlert = $item->alerts->first(fn ($a) => ! $a->is_resolved && $a->severity === 'RED');
            $reworkAlert = $item->alerts->first(fn ($a) => ! $a->is_resolved && $a->severity === 'YELLOW');

            if ($isOverdue || $stuckProgress || $stuckAlert || $reworkAlert) {
                $currentStage = null;
                $requiredStages = $item->required_stages ?? [];
                foreach ($requiredStages as $stage) {
                    $prog = $item->itemProgresses->firstWhere('stage_name', $stage);
                    if ($prog && $prog->status !== 'COMPLETED') {
                        $currentStage = $stage;
                        break;
                    }
                }

                if ($currentStage !== null) {
                    $stageLower = strtolower($currentStage);
                    if (in_array($stageLower, ['design', 'drafter', 'drafting', 'drawing', 'gambar', 'draft'])) {
                        $currentStage = 'Drafter';
                    } elseif (in_array($stageLower, ['material', 'bahan', 'purchasing', 'vendor'])) {
                        $currentStage = 'Purchasing';
                    } elseif (in_array($stageLower, ['machining', 'fabrication', 'cnc', 'milling', 'welder', 'helper', 'production', 'fabrikasi'])) {
                        $currentStage = 'Production';
                    } elseif ($stageLower === 'qc') {
                        $currentStage = 'QC';
                    } elseif (in_array($stageLower, ['delivery', 'pengiriman'])) {
                        $currentStage = 'Delivery';
                    }
                }

                $reason = 'Overdue';
                if ($stuckAlert) {
                    $reason = $stuckAlert->message;
                } elseif ($reworkAlert) {
                    $reason = $reworkAlert->message;
                } elseif ($stuckProgress) {
                    $reason = "Stuck on stage '{$stuckProgress->stage_name}'";
                }

                $daysOverdue = now()->startOfDay()->gt($deadline) ? abs(now()->startOfDay()->diffInDays($deadline)) : 0;

                $delayedItemsData[] = [
                    'id' => $item->id,
                    'po_id' => $po->id,
                    'po_number' => $po->po_number,
                    'client_name' => $po->client_name,
                    'item_name' => $item->item_name,
                    'progress_percent' => (float) $item->progress_percent,
                    'global_deadline' => $po->global_deadline->toDateString(),
                    'days_overdue' => $daysOverdue,
                    'reason' => $reason,
                    'status' => $item->status,
                    'current_stage' => $currentStage,
                    'po_status' => $po->status,
                    'invoice_status' => $item->invoice_status,
                    'payment_status' => $item->payment_status,
                    'target_qty' => (int) $item->target_qty,
                    'total_delivered_qty' => (int) $item->delivered_qty,
                ];
            }
        }

        // ── 9.5. Complete Items & POs Directory for Click-through Drilldown ─────
        $allItemsData = [];
        $allItems = Item::with(['po.deliveryOrders', 'itemProgresses', 'doItems', 'alerts'])
            ->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty')
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
                    ->orWhere(function ($sub) use ($startDate, $endDate) {
                        $sub->whereIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
                            ->whereBetween('updated_at', [$startDate, $endDate]);
                    });
            })
            ->get();

        foreach ($allItems as $item) {
            $po = $item->po;
            if (! $po) {
                continue;
            }

            $isCompleted = $po->status === 'COMPLETED';
            $deadline = Carbon::parse($po->global_deadline)->startOfDay();

            // Calculate days overdue
            $daysOverdue = 0;
            if ($isCompleted) {
                $latestDoDate = $po->deliveryOrders->max('delivery_date');
                $completionDate = $latestDoDate ? Carbon::parse($latestDoDate)->startOfDay() : $po->updated_at->startOfDay();
                if ($completionDate->gt($deadline)) {
                    $daysOverdue = abs($completionDate->diffInDays($deadline));
                }
            } else {
                if (now()->startOfDay()->gt($deadline)) {
                    $daysOverdue = abs(now()->startOfDay()->diffInDays($deadline));
                }
            }

            // Determine current active stage
            $currentStage = null;
            if ($isCompleted && ($item->invoice_status === 'UNINVOICED' || $item->payment_status === 'UNPAID')) {
                $currentStage = 'Finance';
            } else {
                $requiredStages = $item->required_stages ?? [];
                foreach ($requiredStages as $stage) {
                    $prog = $item->itemProgresses->firstWhere('stage_name', $stage);
                    if ($prog && $prog->status !== 'COMPLETED') {
                        $currentStage = $stage;
                        break;
                    }
                }
                if ($currentStage !== null) {
                    $stageLower = strtolower($currentStage);
                    if (in_array($stageLower, ['design', 'drafter', 'drafting', 'drawing', 'gambar', 'draft'])) {
                        $currentStage = 'Drafter';
                    } elseif (in_array($stageLower, ['material', 'bahan', 'purchasing', 'vendor'])) {
                        $currentStage = 'Purchasing';
                    } elseif (in_array($stageLower, ['machining', 'fabrication', 'cnc', 'milling', 'welder', 'helper', 'production', 'fabrikasi'])) {
                        $currentStage = 'Production';
                    } elseif ($stageLower === 'qc') {
                        $currentStage = 'QC';
                    } elseif (in_array($stageLower, ['delivery', 'pengiriman'])) {
                        $currentStage = 'Delivery';
                    }
                }
            }

            // Determine if PO is completed on time
            $isOnTime = false;
            if ($isCompleted) {
                $latestDoDate = $po->deliveryOrders->max('delivery_date');
                if ($latestDoDate) {
                    $latestDo = Carbon::parse($latestDoDate)->startOfDay();
                    $isOnTime = $latestDo->lte($deadline);
                } else {
                    $isOnTime = $po->updated_at->startOfDay()->lte($deadline);
                }
            }

            // Get delay reason (if any)
            $reason = null;
            $reasonType = null;
            if ($daysOverdue > 0 || $currentStage === 'Finance') {
                $stuckProgress = $item->itemProgresses->firstWhere('status', 'STUCK');
                $stuckAlert = $item->alerts->first(fn ($a) => ! $a->is_resolved && $a->severity === 'RED');
                $reworkAlert = $item->alerts->first(fn ($a) => ! $a->is_resolved && $a->severity === 'YELLOW');

                if ($stuckAlert) {
                    $reason = $stuckAlert->message;
                    $activeAlert = $stuckAlert;
                } elseif ($reworkAlert) {
                    $reason = $reworkAlert->message;
                    $activeAlert = $reworkAlert;
                } elseif ($stuckProgress) {
                    $reason = "Stuck on stage '{$stuckProgress->stage_name}'";
                    $activeAlert = null;
                } elseif ($item->invoice_status === 'UNINVOICED') {
                    $reason = 'Uninvoiced';
                    $activeAlert = null;
                } elseif ($item->payment_status === 'UNPAID') {
                    $reason = 'Unpaid';
                    $activeAlert = null;
                } else {
                    $reason = 'Delayed';
                    $activeAlert = null;
                }

                if ($activeAlert) {
                    if ($activeAlert->reason_type) {
                        $reasonType = match (true) {
                            str_contains($activeAlert->reason_type, 'Machine') || str_contains($activeAlert->reason_type, 'Mesin') => 'Machine Broken',
                            str_contains($activeAlert->reason_type, 'Material') => 'Material Delay',
                            str_contains($activeAlert->reason_type, 'Rework') || str_contains($activeAlert->reason_type, 'QC') => 'QC Rework',
                            str_contains($activeAlert->reason_type, 'Power') || str_contains($activeAlert->reason_type, 'Listrik') => 'Power Outage',
                            str_contains($activeAlert->reason_type, 'Human') || str_contains($activeAlert->reason_type, 'Kesalahan') => 'Human Error',
                            str_contains($activeAlert->reason_type, 'Sick') || str_contains($activeAlert->reason_type, 'Sakit') => 'Operator Sick',
                            default => 'Other',
                        };
                    } else {
                        $msg = strtolower($activeAlert->message);
                        $reasonType = match (true) {
                            str_contains($msg, 'machine') || str_contains($msg, 'mesin') || str_contains($msg, 'broken') || str_contains($msg, 'rusak') => 'Machine Broken',
                            str_contains($msg, 'material') || str_contains($msg, 'bahan') || str_contains($msg, 'shortage') || str_contains($msg, 'habis') || str_contains($msg, 'vendor') => 'Material Delay',
                            str_contains($msg, 'rework') || str_contains($msg, 'reject') || str_contains($msg, 'qc') => 'QC Rework',
                            str_contains($msg, 'power') || str_contains($msg, 'listrik') => 'Power Outage',
                            str_contains($msg, 'absent') || str_contains($msg, 'absen') || str_contains($msg, 'sakit') || str_contains($msg, 'sick') => 'Operator Sick',
                            str_contains($msg, 'human') || str_contains($msg, 'error') || str_contains($msg, 'kesalahan') => 'Human Error',
                            default => 'Other',
                        };
                    }
                } elseif ($stuckProgress) {
                    $reasonType = 'Other';
                } elseif ($item->invoice_status === 'UNINVOICED') {
                    $reasonType = 'Uninvoiced';
                } elseif ($item->payment_status === 'UNPAID') {
                    $reasonType = 'Unpaid';
                }
            }

            // Determine manufactured completed quantity in range
            $deliveredQtyInRange = 0;
            if ($item->item_type === 'MANUFACTURE') {
                $deliveredQtyInRange = $item->doItems
                    ->filter(function ($doItem) use ($startDate, $endDate) {
                        return $doItem->updated_at >= $startDate && $doItem->updated_at <= $endDate;
                    })
                    ->sum('delivered_qty');
            }

            $allItemsData[] = [
                'id' => $item->id,
                'po_id' => $po->id,
                'po_number' => $po->po_number,
                'client_name' => $po->client_name,
                'item_name' => $item->item_name,
                'progress_percent' => (float) $item->progress_percent,
                'global_deadline' => $po->global_deadline->toDateString(),
                'days_overdue' => $daysOverdue,
                'reason' => $reason,
                'reason_type' => $reasonType,
                'status' => $item->status,
                'po_status' => $po->status,
                'is_urgent' => (bool) $po->is_urgent,
                'invoice_status' => $item->invoice_status,
                'payment_status' => $item->payment_status,
                'current_stage' => $currentStage,
                'is_on_time' => $isOnTime,
                'delivered_qty' => (int) $deliveredQtyInRange,
                'target_qty' => (int) $item->target_qty,
                'total_delivered_qty' => (int) $item->delivered_qty,
            ];
        }

        // ── 10. Client Health Scoreboard ──────────────────────────────────────
        $clientHealth = $this->buildClientHealth($startDate, $endDate);

        // ── 11. Finance Health Strip ──────────────────────────────────────────
        $uninvoicedCount = Item::where('invoice_status', 'UNINVOICED')
            ->whereHas('po', fn ($q) => $q->where('status', 'COMPLETED'))
            ->count();

        $unpaidCount = Item::where('payment_status', 'UNPAID')
            ->where('invoice_status', '!=', 'UNINVOICED')
            ->whereHas('po', fn ($q) => $q->where('status', 'COMPLETED'))
            ->count();

        return [
            'otdr' => $otdr,
            'manufacture' => [
                'delivered' => $deliveredManufacture,
                'completed' => $deliveredManufacture, // keep 'completed' key for backward-compat with existing frontend
                'target' => $targetManufacture,
            ],
            'buyout' => [
                'completed' => round($outputBuyout, 1),
                'target' => $targetBuyout,
            ],
            'service' => [
                'completed' => round($outputService, 1),
                'target' => $targetService,
            ],
            'risks' => [
                'red' => $redRisks,
                'yellow' => $yellowRisks,
            ],
            'avg_delay_days' => $avgDelayDays,
            'delayed_pos_count' => $delayedPosCount,
            'urgent_active' => $urgentActiveCount,
            'delay_reasons' => $delayReasons,
            'trend_data' => $trendData,
            'stage_metrics' => $stageMetrics,
            'delayed_items' => $delayedItemsData,
            'all_items' => $allItemsData,
            'client_health' => $clientHealth,
            'finance_health' => [
                'uninvoiced_count' => $uninvoicedCount,
                'unpaid_count' => $unpaidCount,
            ],
            // Period comparison — same keys, previous period values
            'previous' => [
                'otdr' => $prevOtdr,
                'manufacture' => [
                    'delivered' => $prevDeliveredManufacture,
                    'target' => $prevTargetManufacture,
                ],
                'avg_delay_days' => $prevAvgDelayDays,
            ],
        ];
    }

    // ── Helper: date range bounds ─────────────────────────────────────────────

    private function getRangeBounds(string $range): array
    {
        return match ($range) {
            'week' => [now()->subDays(6)->startOfDay(), now()->endOfDay()],
            'year' => [now()->subDays(364)->startOfDay(), now()->endOfDay()],
            default => [now()->subDays(29)->startOfDay(), now()->endOfDay()], // month
        };
    }

    private function getPreviousRangeBounds(string $range): array
    {
        return match ($range) {
            'week' => [now()->subDays(13)->startOfDay(), now()->subDays(7)->endOfDay()],
            'year' => [now()->subDays(729)->startOfDay(), now()->subDays(365)->endOfDay()],
            default => [now()->subDays(59)->startOfDay(), now()->subDays(30)->endOfDay()], // prev month
        };
    }

    // ── Helper: OTDR for a given range ───────────────────────────────────────
    // Filters by global_deadline IN the range (not created_at).

    private function calcOtdr(Carbon $startDate, Carbon $endDate): ?float
    {
        $posInPeriod = Po::whereBetween('global_deadline', [$startDate->toDateString(), $endDate->toDateString()])
            ->where(function ($query) {
                $query->where('status', 'COMPLETED')
                    ->orWhere('global_deadline', '<', now()->toDateString());
            })
            ->with(['deliveryOrders'])
            ->get();

        $activeOverduePos = Po::whereNotIn('status', ['COMPLETED', 'CANCELLED'])
            ->where('global_deadline', '<', now()->toDateString())
            ->with(['deliveryOrders'])
            ->get();

        $evaluatedPos = $posInPeriod->merge($activeOverduePos)->unique('id');
        $totalConsidered = $evaluatedPos->count();
        $onTimeCount = 0;

        foreach ($evaluatedPos as $po) {
            $deadline = Carbon::parse($po->global_deadline)->startOfDay();
            if ($po->status === 'COMPLETED') {
                $latestDoDate = $po->deliveryOrders->max('delivery_date');
                if ($latestDoDate) {
                    $latestDo = Carbon::parse($latestDoDate)->startOfDay();
                    if ($latestDo->lte($deadline)) {
                        $onTimeCount++;
                    }
                } else {
                    if ($po->updated_at->startOfDay()->lte($deadline)) {
                        $onTimeCount++;
                    }
                }
            } else {
                // Active order with deadline past current date is overdue (failed on time delivery)
            }
        }

        return $totalConsidered > 0 ? round(($onTimeCount / $totalConsidered) * 100, 1) : null;
    }

    // ── Helper: Average Delay for a given range ───────────────────────────────

    private function calcAvgDelay(Carbon $startDate, Carbon $endDate): float
    {
        $delayedPos = Po::whereBetween('global_deadline', [$startDate->toDateString(), $endDate->toDateString()])
            ->with(['deliveryOrders'])
            ->get();

        $totalDelayDays = 0;
        $delayedCount = 0;

        foreach ($delayedPos as $po) {
            $deadline = Carbon::parse($po->global_deadline)->startOfDay();
            if ($po->status === 'COMPLETED') {
                $latestDoDate = $po->deliveryOrders->max('delivery_date');
                $completionDate = $latestDoDate ? Carbon::parse($latestDoDate)->startOfDay() : $po->updated_at->startOfDay();
                if ($completionDate->gt($deadline)) {
                    $totalDelayDays += abs($completionDate->diffInDays($deadline));
                    $delayedCount++;
                }
            } else {
                if (now()->startOfDay()->gt($deadline)) {
                    $totalDelayDays += abs(now()->startOfDay()->diffInDays($deadline));
                    $delayedCount++;
                }
            }
        }

        return $delayedCount > 0 ? round($totalDelayDays / $delayedCount, 1) : 0.0;
    }

    // ── Helper: Trend data ────────────────────────────────────────────────────

    private function buildTrendData(string $range): array
    {
        $trendData = [];

        if ($range === 'week') {
            for ($i = 6; $i >= 0; $i--) {
                $date = now()->subDays($i);
                $start = (clone $date)->startOfDay();
                $end = (clone $date)->endOfDay();

                $output = DoItem::whereHas('item', fn ($q) => $q->where('item_type', 'MANUFACTURE'))
                    ->whereBetween('updated_at', [$start, $end])
                    ->sum('delivered_qty');

                $overdue = Po::where('global_deadline', '<', $start->toDateString())
                    ->where(fn ($q) => $q->where('status', '!=', 'COMPLETED')->orWhere('updated_at', '>', $end))
                    ->count();

                $trendData[] = ['label' => $date->format('D'), 'output' => (int) $output, 'overdue' => (int) $overdue];
            }
        } elseif ($range === 'year') {
            for ($i = 11; $i >= 0; $i--) {
                $date = now()->subMonths($i);
                $start = (clone $date)->startOfMonth()->startOfDay();
                $end = (clone $date)->endOfMonth()->endOfDay();

                $output = DoItem::whereHas('item', fn ($q) => $q->where('item_type', 'MANUFACTURE'))
                    ->whereBetween('updated_at', [$start, $end])
                    ->sum('delivered_qty');

                $overdue = Po::where('global_deadline', '<', $start->toDateString())
                    ->where(fn ($q) => $q->where('status', '!=', 'COMPLETED')->orWhere('updated_at', '>', $end))
                    ->count();

                $trendData[] = ['label' => $date->format('M'), 'output' => (int) $output, 'overdue' => (int) $overdue];
            }
        } else { // month
            for ($i = 3; $i >= 0; $i--) {
                $date = now()->subWeeks($i);
                $start = (clone $date)->startOfWeek()->startOfDay();
                $end = (clone $date)->endOfWeek()->endOfDay();

                $output = DoItem::whereHas('item', fn ($q) => $q->where('item_type', 'MANUFACTURE'))
                    ->whereBetween('updated_at', [$start, $end])
                    ->sum('delivered_qty');

                $overdue = Po::where('global_deadline', '<', $start->toDateString())
                    ->where(fn ($q) => $q->where('status', '!=', 'COMPLETED')->orWhere('updated_at', '>', $end))
                    ->count();

                $trendData[] = ['label' => 'Wk '.(4 - $i), 'output' => (int) $output, 'overdue' => (int) $overdue];
            }
        }

        return $trendData;
    }

    // ── Helper: Client Health Scoreboard ─────────────────────────────────────

    private function buildClientHealth(Carbon $startDate, Carbon $endDate): array
    {
        $allPos = Po::with(['items.doItems', 'deliveryOrders'])->get();

        $clients = [];
        foreach ($allPos as $po) {
            $cn = $po->client_name;
            if (! isset($clients[$cn])) {
                $clients[$cn] = [
                    'client_name' => $cn,
                    'active_pos' => 0,
                    'completed_total' => 0,
                    'on_time_count' => 0,
                    'overdue_items' => 0,
                    'uninvoiced_count' => 0,
                    'unpaid_count' => 0,
                ];
            }

            if ($po->status !== 'COMPLETED') {
                $clients[$cn]['active_pos']++;

                // Count overdue items for this PO
                $deadline = Carbon::parse($po->global_deadline)->startOfDay();
                if (now()->startOfDay()->gt($deadline)) {
                    $overdueItems = $po->items->whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])->count();
                    $clients[$cn]['overdue_items'] += $overdueItems;
                }
            } else {
                $clients[$cn]['completed_total']++;
                // On-time check
                $deadline = Carbon::parse($po->global_deadline)->startOfDay();
                $latestDoDate = $po->deliveryOrders->max('delivery_date');
                if ($latestDoDate) {
                    $latestDo = Carbon::parse($latestDoDate)->startOfDay();
                    if ($latestDo->lte($deadline)) {
                        $clients[$cn]['on_time_count']++;
                    }
                }
            }

            // Finance counts across all POs
            foreach ($po->items as $item) {
                if ($item->invoice_status === 'UNINVOICED' && $po->status === 'COMPLETED') {
                    $clients[$cn]['uninvoiced_count']++;
                }
                if ($item->payment_status === 'UNPAID' && $item->invoice_status !== 'UNINVOICED' && $po->status === 'COMPLETED') {
                    $clients[$cn]['unpaid_count']++;
                }
            }
        }

        // Build output with on_time_rate and risk_score for sorting
        $result = [];
        foreach ($clients as $data) {
            $onTimeRate = $data['completed_total'] > 0
                ? round(($data['on_time_count'] / $data['completed_total']) * 100, 0)
                : null; // null = no completed POs yet, can't compute

            $riskScore = $data['overdue_items'] * 3 + $data['uninvoiced_count'] + $data['unpaid_count'] * 2;

            $result[] = [
                'client_name' => $data['client_name'],
                'active_pos' => $data['active_pos'],
                'completed_total' => $data['completed_total'],
                'on_time_rate' => $onTimeRate,
                'overdue_items' => $data['overdue_items'],
                'uninvoiced_count' => $data['uninvoiced_count'],
                'unpaid_count' => $data['unpaid_count'],
                'risk_score' => $riskScore,
            ];
        }

        // Sort by risk score descending (highest risk first)
        usort($result, fn ($a, $b) => $b['risk_score'] <=> $a['risk_score']);

        return $result;
    }

    public function updateProgress(Request $request, $slug, $progressId)
    {
        $request->validate([
            'completed_qty' => ['nullable', 'integer', 'min:0'],
            'progress_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);
        $this->validateStageAccess($progress, auth()->user());

        $item = $progress->item;
        $previousCompletedQty = $progress->completed_qty;
        $previousProgressPercent = $progress->progress_percent;

        $stageLower = strtolower($progress->stage_name);
        $isCustomStage = str_contains($stageLower, 'design') || str_contains($stageLower, 'gambar') || str_contains($stageLower, 'draft') ||
                          str_contains($stageLower, 'material') || str_contains($stageLower, 'bahan') || str_contains($stageLower, 'vendor') || str_contains($stageLower, 'purchasing');

        if ($isCustomStage) {
            $progressPercent = $request->input('progress_percent', 0.00);
            $completedQty = round($item->target_qty * ($progressPercent / 100));
            $status = $progressPercent >= 100.00 ? 'COMPLETED' : 'IN_PROGRESS';
            if ($progressPercent == 0.00) {
                $status = 'PENDING';
            }

            $progress->update([
                'completed_qty' => $completedQty,
                'progress_percent' => $progressPercent,
                'status' => $status,
                'previous_completed_qty' => $previousCompletedQty,
                'previous_progress_percent' => $previousProgressPercent,
            ]);

            // Sync item status attribute
            if (str_contains($stageLower, 'design') || str_contains($stageLower, 'gambar') || str_contains($stageLower, 'draft')) {
                $item->update([
                    'drafter_status' => $progressPercent >= 100.00 ? 'APPROVED' : ($progressPercent > 0 ? 'DRAWING' : null),
                ]);
            } elseif (str_contains($stageLower, 'material') || str_contains($stageLower, 'bahan') || str_contains($stageLower, 'vendor') || str_contains($stageLower, 'purchasing')) {
                $item->update([
                    'purchasing_status' => $progressPercent >= 100.00 ? 'READY' : ($progressPercent >= 66.00 ? 'PROSES' : ($progressPercent >= 33.00 ? 'ORDER' : null)),
                ]);
            }
        } else {
            if ($item->target_qty > 1) {
                $inputQty = (int) $request->input('completed_qty', 0);
                $completedQty = $progress->completed_qty + $inputQty;

                // Determine maximum allowed quantity for this stage
                $maxAllowed = $item->target_qty;
                if (str_contains($stageLower, 'delivery') || str_contains($stageLower, 'pengiriman')) {
                    $qcProgress = ItemProgress::where('item_id', $item->id)
                        ->where('stage_name', 'QC')
                        ->first();
                    if ($qcProgress) {
                        $maxAllowed = $qcProgress->completed_qty;
                    }
                }

                // Cap completed quantity
                $completedQty = min($maxAllowed, $completedQty);
                $progressPercent = ($completedQty / $item->target_qty) * 100;
                $status = $completedQty >= $item->target_qty ? 'COMPLETED' : 'IN_PROGRESS';
                if ($completedQty == 0) {
                    $status = 'PENDING';
                }

                $progress->update([
                    'completed_qty' => $completedQty,
                    'progress_percent' => $progressPercent,
                    'status' => $status,
                    'previous_completed_qty' => $previousCompletedQty,
                    'previous_progress_percent' => $previousProgressPercent,
                ]);
            } else {
                $progressPercent = $request->input('progress_percent', 0.00);
                $status = $progressPercent >= 100.00 ? 'COMPLETED' : 'IN_PROGRESS';

                $progress->update([
                    'progress_percent' => $progressPercent,
                    'status' => $status,
                    'previous_completed_qty' => $previousCompletedQty,
                    'previous_progress_percent' => $previousProgressPercent,
                ]);
            }
        }

        // Auto-resolve any active RED alerts for this stage since it is now active/updating
        Alert::where('item_id', $item->id)
            ->where('is_resolved', false)
            ->where('severity', 'RED')
            ->where('message', 'like', "%on stage '{$progress->stage_name}'%")
            ->update(['is_resolved' => true]);

        // When the 'Delivery' stage progress is updated, automatically create/update a DeliveryOrder and corresponding DoItem
        $stageNameLower = strtolower($progress->stage_name);
        if (str_contains($stageNameLower, 'delivery') || str_contains($stageNameLower, 'pengiriman')) {
            $po = $item->po;
            $deliveryOrder = DeliveryOrder::updateOrCreate([
                'tenant_id' => $item->tenant_id,
                'po_id' => $item->po_id,
                'do_number' => 'DO-'.$po->po_number,
            ], [
                'delivery_date' => now()->toDateString(),
            ]);

            $deliveredQtyUpdate = $item->target_qty > 1
                ? (int) $request->input('completed_qty', 0)
                : ($progress->progress_percent >= 100.00 ? 1 : 0);

            $existing = DoItem::where('delivery_order_id', $deliveryOrder->id)
                ->where('item_id', $item->id)->first();

            if ($item->target_qty === 1 && $existing && $existing->delivered_qty >= 1) {
                $deliveredQtyUpdate = 0;
            }

            $newTotal = min($item->target_qty, ($existing->delivered_qty ?? 0) + $deliveredQtyUpdate);

            DoItem::updateOrCreate([
                'delivery_order_id' => $deliveryOrder->id,
                'item_id' => $item->id,
            ], [
                'delivered_qty' => $newTotal,
            ]);
        }

        $stageLowerForEvent = strtolower($progress->stage_name);
        $isCustomStageForEvent = str_contains($stageLowerForEvent, 'design') || str_contains($stageLowerForEvent, 'gambar') || str_contains($stageLowerForEvent, 'draft') ||
                          str_contains($stageLowerForEvent, 'material') || str_contains($stageLowerForEvent, 'bahan') || str_contains($stageLowerForEvent, 'vendor') || str_contains($stageLowerForEvent, 'purchasing');

        if ($isCustomStageForEvent) {
            $msg = "Progress updated for stage '{$progress->stage_name}' to ".round($progress->progress_percent)."% on item '{$item->item_name}' (PO: {$item->po->po_number}).";
        } else {
            if ($item->target_qty > 1) {
                $inputQty = (int) $request->input('completed_qty', 0);
                $msg = "Completed quantity updated for stage '{$progress->stage_name}' by +{$inputQty} ({$progress->completed_qty}/{$item->target_qty}) on item '{$item->item_name}' (PO: {$item->po->po_number}).";
            } else {
                $msg = "Progress updated for stage '{$progress->stage_name}' to ".round($progress->progress_percent)."% on item '{$item->item_name}' (PO: {$item->po->po_number}).";
            }
        }

        broadcast(new TaskUpdated($item->tenant_id, $msg))->toOthers();

        return back()->with('success', 'Progress updated.');
    }

    public function cancelLastUpdate(Request $request, $slug, $progressId)
    {
        $progress = ItemProgress::findOrFail($progressId);
        $this->validateStageAccess($progress, auth()->user());

        if ($progress->previous_completed_qty === null && $progress->previous_progress_percent === null) {
            return back()->with('error', 'No previous progress update to cancel.');
        }

        $prevQty = $progress->previous_completed_qty ?? 0;
        $prevPercent = $progress->previous_progress_percent ?? 0.00;

        $item = $progress->item;
        $status = 'IN_PROGRESS';

        $stageLower = strtolower($progress->stage_name);
        $isCustomStage = str_contains($stageLower, 'design') || str_contains($stageLower, 'gambar') || str_contains($stageLower, 'draft') ||
                          str_contains($stageLower, 'material') || str_contains($stageLower, 'bahan') || str_contains($stageLower, 'vendor') || str_contains($stageLower, 'purchasing');

        if ($isCustomStage) {
            if ($prevPercent >= 100.00) {
                $status = 'COMPLETED';
            } elseif ($prevPercent == 0.00) {
                $status = 'PENDING';
            } else {
                $status = 'IN_PROGRESS';
            }
        } else {
            if ($item->target_qty > 1) {
                if ($prevQty >= $item->target_qty) {
                    $status = 'COMPLETED';
                } elseif ($prevQty == 0) {
                    $status = 'PENDING';
                }
            } else {
                if ($prevPercent >= 100.00) {
                    $status = 'COMPLETED';
                } elseif ($prevPercent == 0.00) {
                    $status = 'PENDING';
                }
            }
        }

        $progress->update([
            'completed_qty' => $prevQty,
            'progress_percent' => $prevPercent,
            'status' => $status,
            'previous_completed_qty' => null,
            'previous_progress_percent' => null,
        ]);

        $stageNameLower = strtolower($progress->stage_name);

        // Revert drafter_status on item if it's Design stage
        if (str_contains($stageNameLower, 'design') || str_contains($stageNameLower, 'gambar') || str_contains($stageNameLower, 'draft')) {
            $item->update([
                'drafter_status' => $prevPercent >= 100.00 ? 'APPROVED' : ($prevPercent > 0 ? 'DRAWING' : null),
            ]);
        }

        // Revert purchasing_status on item if it's Material stage
        if (str_contains($stageNameLower, 'material') || str_contains($stageNameLower, 'bahan') || str_contains($stageNameLower, 'vendor') || str_contains($stageNameLower, 'purchasing')) {
            $item->update([
                'purchasing_status' => $prevPercent >= 100.00 ? 'READY' : ($prevPercent >= 66.00 ? 'PROSES' : ($prevPercent >= 33.00 ? 'ORDER' : null)),
            ]);
        }

        // Revert DO Item Qty if it was a Delivery stage
        if (str_contains($stageNameLower, 'delivery') || str_contains($stageNameLower, 'pengiriman')) {
            $deliveryOrder = DeliveryOrder::where('po_id', $item->po_id)->first();
            if ($deliveryOrder) {
                $deliveredQty = $item->target_qty > 1
                    ? $prevQty
                    : ($prevPercent >= 100.00 ? 1 : 0);

                DoItem::updateOrCreate([
                    'delivery_order_id' => $deliveryOrder->id,
                    'item_id' => $item->id,
                ], [
                    'delivered_qty' => $deliveredQty,
                ]);
            }
        }

        broadcast(new TaskUpdated($item->tenant_id, "Last progress update reverted for stage '{$progress->stage_name}' on item '{$item->item_name}' (PO: {$item->po->po_number})."))->toOthers();

        return back()->with('success', 'Last progress update reverted successfully.');
    }

    public function reportKendala(Request $request, $slug, $progressId)
    {
        $request->validate([
            'kendala_type' => ['required', 'string'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);

        // Ensure item belongs to active tenant (all worker roles in tenant can report trouble)
        \Illuminate\Support\Facades\Gate::authorize('view-tenant', $progress->item ? $progress->item->tenant_id : TenantManager::getTenantId());

        $progress->update(['status' => 'STUCK']);

        $item = $progress->item;
        $po = $item->po;

        $note = $request->input('note');
        $noteText = $note ? " (Note: {$note})" : '';

        // Save RED alert with structured reason_type for accurate analytics
        $alert = Alert::create([
            'tenant_id' => TenantManager::getTenantId(),
            'item_id' => $item->id,
            'severity' => 'RED',
            'reason_type' => $request->kendala_type,
            'message' => "Stuck: {$request->kendala_type} on stage '{$progress->stage_name}' for item '{$item->item_name}' (PO: {$po->po_number}){$noteText}.",
            'is_resolved' => false,
        ]);

        // Broadcast alert
        broadcast(new KendalaReported($alert))->toOthers();

        return back()->with('success', 'Kendala reported successfully.');
    }

    public function listTroubles(Request $request, $slug)
    {
        // 1. Resolve tenant context by slug
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->first();
        if (! $tenant) {
            abort(404, 'Tenant not found.');
        }
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        if (! auth()->check()) {
            return redirect()->route('worker.dashboard', ['slug' => $slug]);
        }

        $user = auth()->user();
        \Illuminate\Support\Facades\Gate::authorize('view-tenant', $tenant->id);

        // Fetch alerts for this tenant (hide admin BLUE severity alerts from standard floor operators)
        $query = Alert::with(['item.po'])->orderBy('created_at', 'desc');

        $user->loadMissing('roleRelation');
        if ($user->role_level !== 'office' && strcasecmp($user->role_name, 'PPIC') !== 0) {
            $query->where('severity', '!=', 'BLUE');
        }

        $alerts = $query->get();

        return Inertia::render('Worker/TroubleReports', [
            'alerts' => $alerts,
            'auth_user' => $user,
            'tenant' => $tenant,
        ]);
    }

    public function resolveAlert(Request $request, $slug, $alertId)
    {
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->firstOrFail();
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        $user = auth()->user()->loadMissing('roleRelation', 'postRelation');
        \Illuminate\Support\Facades\Gate::authorize('view-tenant', $tenant->id);

        \Illuminate\Support\Facades\Gate::authorize('resolve-trouble');

        $alert = Alert::where('tenant_id', $tenant->id)->findOrFail($alertId);
        $alert->update([
            'is_resolved' => true,
        ]);

        return back()->with('success', 'Trouble report resolved successfully.');
    }

    public function logQcRework(Request $request, $slug, $progressId)
    {
        $user = auth()->user()->load('roleRelation');
        \Illuminate\Support\Facades\Gate::authorize('log-rework');

        $request->validate([
            'reject_qty' => ['required', 'integer', 'min:1'],
            'rework_reason' => ['required', 'string', 'min:3'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);
        $item = $progress->item;
        $po = $item->po;

        // Spawn a rework stage: stage_name - REWORK
        $reworkStageName = $progress->stage_name.' - REWORK';

        $reworkProgress = ItemProgress::firstOrCreate([
            'tenant_id' => TenantManager::getTenantId(),
            'item_id' => $item->id,
            'stage_name' => $reworkStageName,
        ], [
            'completed_qty' => 0,
            'progress_percent' => 0.00,
            'status' => 'PENDING',
        ]);

        // Deduct rejected quantity/progress from original stage
        if ($item->target_qty > 1) {
            $progress->completed_qty = max(0, $progress->completed_qty - $request->reject_qty);
            $progress->progress_percent = ($progress->completed_qty / $item->target_qty) * 100;
            $progress->status = $progress->completed_qty >= $item->target_qty ? 'COMPLETED' : 'IN_PROGRESS';
            $progress->save();
        } else {
            $progress->progress_percent = 0.00;
            $progress->status = 'IN_PROGRESS';
            $progress->save();
        }

        // Update item status if it was completed or pending, back to in progress
        if ($item->status === 'COMPLETED') {
            $item->update(['status' => 'IN_PROGRESS']);
        }

        // Create a YELLOW alert with structured reason_type and the custom input reason
        $alert = Alert::create([
            'tenant_id' => TenantManager::getTenantId(),
            'item_id' => $item->id,
            'user_id' => $user->id,
            'severity' => 'YELLOW',
            'reason_type' => 'QC Rework',
            'message' => "QC Rework: {$request->reject_qty} items rejected on stage '{$progress->stage_name}' for item '{$item->item_name}' (PO: {$po->po_number}).",
            'rework_reason' => $request->rework_reason,
            'is_resolved' => false,
        ]);

        broadcast(new QcReworkLogged($alert))->toOthers();

        return back()->with('success', 'QC Rework logged and Rework stage spawned.');
    }

    public function updateDrafterStatus(Request $request, $slug, $itemId)
    {
        $request->validate([
            'drafter_status' => ['required', 'string', 'in:DRAWING,APPROVED'],
        ]);

        $user = auth()->user()->load('roleRelation');
        $userRoleName = $user->role_name;

        \Illuminate\Support\Facades\Gate::authorize('update-drafter');

        $item = Item::findOrFail($itemId);

        // Find the design stage to store previous values
        $designProgress = ItemProgress::where('item_id', $item->id)
            ->where(function ($q) {
                $q->where('stage_name', 'like', '%Design%')
                    ->orWhere('stage_name', 'like', '%DESIGN%')
                    ->orWhere('stage_name', 'like', '%Gambar%')
                    ->orWhere('stage_name', 'like', '%gambar%')
                    ->orWhere('stage_name', 'like', '%Draft%')
                    ->orWhere('stage_name', 'like', '%draft%');
            })
            ->first();

        if ($designProgress) {
            $previousCompletedQty = $designProgress->completed_qty;
            $previousProgressPercent = $designProgress->progress_percent;
        } else {
            $previousCompletedQty = null;
            $previousProgressPercent = null;
        }

        $item->update(['drafter_status' => $request->drafter_status]);

        if ($designProgress) {
            $pct = $request->drafter_status === 'APPROVED' ? 100.00 : 50.00;
            $status = $pct >= 100.00 ? 'COMPLETED' : 'IN_PROGRESS';

            $designProgress->update([
                'completed_qty' => round($item->target_qty * ($pct / 100)),
                'progress_percent' => $pct,
                'status' => $status,
                'previous_completed_qty' => $previousCompletedQty,
                'previous_progress_percent' => $previousProgressPercent,
            ]);
        }

        broadcast(new TaskUpdated($item->tenant_id, "Drafter status updated to '{$request->drafter_status}' for item '{$item->item_name}' (PO: {$item->po->po_number})."))->toOthers();

        return back()->with('success', 'Drafter status updated.');
    }

    public function updatePurchasingStatus(Request $request, $slug, $itemId)
    {
        $request->validate([
            'purchasing_status' => ['required', 'string', 'in:ORDER,PROSES,READY'],
            'vendor_name' => ['nullable', 'string', 'max:255'],
            'vendor_phone' => ['nullable', 'string', 'max:50'],
            'vendor_po' => ['nullable', 'string', 'max:100'],
            'eta_date' => ['nullable', 'date'],
        ]);

        $user = auth()->user()->load('roleRelation');

        \Illuminate\Support\Facades\Gate::authorize('update-purchasing');

        $item = Item::findOrFail($itemId);

        // Find the material stage to store previous values
        $materialProgress = ItemProgress::where('item_id', $item->id)
            ->where(function ($q) {
                $q->where('stage_name', 'like', '%Material%')
                    ->orWhere('stage_name', 'like', '%MATERIAL%')
                    ->orWhere('stage_name', 'like', '%Bahan%')
                    ->orWhere('stage_name', 'like', '%bahan%');
            })
            ->first();

        if ($materialProgress) {
            $previousCompletedQty = $materialProgress->completed_qty;
            $previousProgressPercent = $materialProgress->progress_percent;
        } else {
            $previousCompletedQty = null;
            $previousProgressPercent = null;
        }

        $updateData = ['purchasing_status' => $request->purchasing_status];
        if ($request->has('vendor_name')) {
            $updateData['vendor_name'] = $request->vendor_name;
        }
        if ($request->has('vendor_phone')) {
            $updateData['vendor_phone'] = $request->vendor_phone;
        }
        if ($request->has('vendor_po')) {
            $updateData['vendor_po'] = $request->vendor_po;
        }
        if ($request->has('eta_date')) {
            $updateData['eta_date'] = $request->eta_date;
        }

        $item->update($updateData);

        if ($materialProgress) {
            $pct = 0.00;
            if ($request->purchasing_status === 'READY') {
                $pct = 100.00;
            } elseif ($request->purchasing_status === 'PROSES') {
                $pct = 66.00;
            } elseif ($request->purchasing_status === 'ORDER') {
                $pct = 33.00;
            }

            $status = $pct >= 100.00 ? 'COMPLETED' : 'IN_PROGRESS';

            $materialProgress->update([
                'completed_qty' => round($item->target_qty * ($pct / 100)),
                'progress_percent' => $pct,
                'status' => $status,
                'previous_completed_qty' => $previousCompletedQty,
                'previous_progress_percent' => $previousProgressPercent,
            ]);
        }

        broadcast(new TaskUpdated($item->tenant_id, "Purchasing status updated to '{$request->purchasing_status}' for item '{$item->item_name}' (PO: {$item->po->po_number})."))->toOthers();

        return back()->with('success', 'Purchasing status updated.');
    }

    public function updateFinanceStatus(Request $request, $slug, $itemId)
    {
        $request->validate([
            'invoice_status' => ['required', 'string', 'in:UNINVOICED,PARTIAL,INVOICED'],
            'payment_status' => ['required', 'string', 'in:UNPAID,PARTIAL_PAID,PAID'],
            'invoiced_qty' => ['nullable', 'integer', 'min:0'],
        ]);

        $user = auth()->user()->load('roleRelation');
        \Illuminate\Support\Facades\Gate::authorize('update-finance');

        $item = Item::findOrFail($itemId);

        $tenant = Tenant::find(TenantManager::getTenantId());
        $settings = $tenant->workflow_settings ?? [];
        $workflowMode = $settings['workflow_mode'] ?? 'loose';

        if ($workflowMode === 'strict') {
            $reqDeliveryForFinance = true;
        } elseif ($workflowMode === 'loose') {
            $reqDeliveryForFinance = true;
        } else {
            $reqDeliveryForFinance = (bool) ($settings['require_delivery_for_finance'] ?? true);
        }

        if ($reqDeliveryForFinance) {
            \Illuminate\Support\Facades\Gate::authorize('update-finance-status-lock', clone $item);
        }

        $invoicedQty = (int) $request->input('invoiced_qty', 0);
        $maxAllowed = $item->delivered_qty;

        if ($request->invoice_status === 'INVOICED') {
            $invoicedQty = $maxAllowed;
        } elseif ($request->invoice_status === 'UNINVOICED') {
            $invoicedQty = 0;
        } else {
            if ($invoicedQty > $maxAllowed) {
                $invoicedQty = $maxAllowed;
            }
        }

        // Auto-calc invoice_status from invoiced_qty vs delivered_qty
        if ($maxAllowed > 0) {
            $invoiceStatus = $invoicedQty >= $maxAllowed ? 'INVOICED' : ($invoicedQty > 0 ? 'PARTIAL' : 'UNINVOICED');
        } else {
            $invoiceStatus = 'UNINVOICED';
        }

        $item->update([
            'invoice_status' => $invoiceStatus,
            'payment_status' => $request->payment_status,
            'invoiced_qty' => $invoicedQty,
        ]);

        // PO Closing cascade: if all items in PO are paid, PO = CLOSED
        $po = $item->po;
        if ($po) {
            $allPaid = true;
            foreach ($po->items()->get() as $poItem) {
                if ($poItem->status === 'CANCELLED' || $poItem->status === 'TERMINATED') {
                    continue;
                }
                if ($poItem->payment_status !== 'PAID') {
                    $allPaid = false;
                    break;
                }
            }

            if ($allPaid && $po->status !== 'CLOSED') {
                $po->update(['status' => 'CLOSED']);
            }
        }

        broadcast(new TaskUpdated($item->tenant_id, "Finance status updated (Invoice: {$invoiceStatus}, Payment: {$request->payment_status}) for item '{$item->item_name}' (PO: {$item->po->po_number})."))->toOthers();

        return back()->with('success', 'Finance status updated.');
    }

    public function financeLedger(Request $request, $slug)
    {
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->firstOrFail();
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        $user = auth()->user()->loadMissing('roleRelation', 'postRelation');
        \Illuminate\Support\Facades\Gate::authorize('view-tenant', $tenant->id);

        $roleName = strtoupper($user->role_name ?? '');
        $postName = strtoupper($user->post_name ?? '');
        $isOffice = $user->role_level === 'office' || $user->isOwner();

        \Illuminate\Support\Facades\Gate::authorize('view-ledger');

        $pos = Po::with([
            'items' => function ($q) {
                $q->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty')
                    ->with(['itemProgresses']);
            },
        ])->orderBy('created_at', 'desc')->get();

        return Inertia::render('Worker/FinanceLedger', [
            'auth_user' => $user,
            'tenant' => $tenant,
            'pos' => $pos,
        ]);
    }

    private function validateStageAccess(ItemProgress $progress, User $user): void
    {
        $user->loadMissing('roleRelation');
        $roleName = $user->role_name;
        $isOffice = $user->role_level === 'office';

        // 1. Role validation check using STAGE_ROLE_MAP
        if (! $isOffice) {
            $stageLower = strtolower($progress->stage_name);
            foreach (self::STAGE_ROLE_MAP as $keyword => $roles) {
                if (str_contains($stageLower, $keyword)) {
                    if (! in_array($roleName, $roles)) {
                        $rolesStr = implode('/', $roles);
                        \Illuminate\Auth\Access\Response::deny("Stage locked: Only {$rolesStr} operators can update this stage.")->authorize();
                    }
                    break;
                }
            }
        }

        $item = $progress->item;
        if (! $item) {
            return;
        }

        $requiredStages = $item->required_stages ?? [];
        $isVendorChecked = in_array('Vendor', $requiredStages);
        $isMachiningChecked = in_array('Machining', $requiredStages) || in_array('CNC', $requiredStages);
        $isFabricationChecked = in_array('Fabrication', $requiredStages) || in_array('FABRICATION', $requiredStages) || in_array('FABRIKASI', $requiredStages);
        $stageNameLower = strtolower($progress->stage_name);

        // 2. Off-state locks and workflow locks
        if (! $isOffice) {
            if ($isVendorChecked) {
                if (str_contains($stageNameLower, 'machining') ||
                    str_contains($stageNameLower, 'fabrication') || str_contains($stageNameLower, 'fabrikasi') ||
                    str_contains($stageNameLower, 'qc') ||
                    str_contains($stageNameLower, 'delivery') || str_contains($stageNameLower, 'pengiriman')) {
                    \Illuminate\Auth\Access\Response::deny('Stage locked: This is a Vendor job, so other production stages are locked.')->authorize();
                }
            }

            if ($isMachiningChecked && ! $isFabricationChecked) {
                if (str_contains($stageNameLower, 'fabrication') || str_contains($stageNameLower, 'fabrikasi')) {
                    \Illuminate\Auth\Access\Response::deny('Stage locked: Fabrication is not required/checked for this item.')->authorize();
                }
            }

            if ($isFabricationChecked && ! $isMachiningChecked) {
                if (str_contains($stageNameLower, 'machining')) {
                    \Illuminate\Auth\Access\Response::deny('Stage locked: Machining is not required/checked for this item.')->authorize();
                }
            }

            // Resolve workflow locks via Tenant settings
            $tenant = Tenant::find(TenantManager::getTenantId());
            $settings = $tenant->workflow_settings ?? [];
            $workflowMode = $settings['workflow_mode'] ?? 'loose';

            if ($workflowMode === 'strict') {
                $reqDesign = true;
                $reqMaterial = true;
                $reqProductionForQc = true;
                $reqQcForDelivery = true;
            } elseif ($workflowMode === 'loose') {
                $reqDesign = false;
                $reqMaterial = false;
                $reqProductionForQc = true;
                $reqQcForDelivery = true;
            } else {
                $reqDesign = (bool) ($settings['require_design_approved_for_production'] ?? false);
                $reqMaterial = (bool) ($settings['require_material_ready_for_production'] ?? false);
                $reqProductionForQc = (bool) ($settings['require_production_completed_for_qc'] ?? true);
                $reqQcForDelivery = (bool) ($settings['require_qc_completed_for_delivery'] ?? true);
            }

            // Design blocks Production
            if ($reqDesign && (str_contains($stageNameLower, 'machining') || str_contains($stageNameLower, 'cnc') || str_contains($stageNameLower, 'fabrication') || str_contains($stageNameLower, 'fabrikasi'))) {
                $designProgress = ItemProgress::where('item_id', $item->id)
                    ->where(function ($q) {
                        $q->where('stage_name', 'like', '%design%')
                            ->orWhere('stage_name', 'like', '%gambar%')
                            ->orWhere('stage_name', 'like', '%draft%');
                    })
                    ->first();
                if ($designProgress && $designProgress->status !== 'COMPLETED') {
                    \Illuminate\Auth\Access\Response::deny('Stage locked: Production requires Design/Drawing to be completed/approved.')->authorize();
                }
            }

            // Material blocks Production
            if ($reqMaterial && (str_contains($stageNameLower, 'machining') || str_contains($stageNameLower, 'cnc') || str_contains($stageNameLower, 'fabrication') || str_contains($stageNameLower, 'fabrikasi'))) {
                $materialProgress = ItemProgress::where('item_id', $item->id)
                    ->where(function ($q) {
                        $q->where('stage_name', 'like', '%material%')
                            ->orWhere('stage_name', 'like', '%bahan%')
                            ->orWhere('stage_name', 'like', '%vendor%')
                            ->orWhere('stage_name', 'like', '%purchasing%');
                    })
                    ->first();
                if ($materialProgress && $materialProgress->status !== 'COMPLETED') {
                    \Illuminate\Auth\Access\Response::deny('Stage locked: Production requires Material/Bahan to be ready/completed.')->authorize();
                }
            }

            // QC requires all preceding stages (by required_stages order) to be COMPLETED
            if ($reqProductionForQc && str_contains($stageNameLower, 'qc') && ! str_contains($stageNameLower, 'rework')) {
                $requiredStages = $item->required_stages ?? [];
                $qcIndex = null;
                foreach ($requiredStages as $i => $rs) {
                    if (str_contains(strtolower($rs), 'qc') && ! str_contains(strtolower($rs), 'rework')) {
                        $qcIndex = $i;
                        break;
                    }
                }

                if ($qcIndex !== null) {
                    $precedingNames = array_slice($requiredStages, 0, $qcIndex);
                    $precedingStages = ItemProgress::where('item_id', $item->id)
                        ->whereIn('stage_name', $precedingNames)
                        ->get();

                    foreach ($precedingStages as $stage) {
                        if ($stage->status !== 'COMPLETED') {
                            \Illuminate\Auth\Access\Response::deny("Stage locked: QC requires all preceding stages to be COMPLETED first. ({$stage->stage_name} is not done yet)")->authorize();
                        }
                    }
                }
            }

            // Delivery stage update lockout
            if ($reqQcForDelivery && (str_contains($stageNameLower, 'delivery') || str_contains($stageNameLower, 'pengiriman'))) {
                $qcProgress = ItemProgress::where('item_id', $item->id)
                    ->where('stage_name', 'QC')
                    ->first();
                if (! $qcProgress || ($qcProgress->completed_qty <= 0 && $qcProgress->progress_percent <= 0)) {
                    \Illuminate\Auth\Access\Response::deny('Stage locked: Delivery cannot be updated until QC stage has completed quantities.')->authorize();
                }
            }
        }
    }
}
