<?php

namespace App\Http\Controllers;

use App\Events\KendalaReported;
use App\Events\QcReworkLogged;
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
                ->with('roleRelation:id,name', 'postRelation:id,name')
                ->get(['id', 'name', 'role_id', 'post_id']);

            return Inertia::render('Worker/Login', [
                'tenant' => [
                    'id' => $tenant->id,
                    'company_name' => $tenant->company_name,
                    'slug' => $tenant->slug,
                ],
                'workers' => $workers,
            ]);
        }

        // 3. Authenticated: verify tenant scope matching
        $user = auth()->user()->load('roleRelation', 'postRelation');
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized tenant access.');
        }

        // 4. Determine dashboard views by office vs floor roles division
        if (strtoupper($user->role_name) === 'PPIC') {
            $ppicController = app(PpicDashboardController::class);

            return $ppicController->index($request, $slug);
        }

        if ($user->role_level === 'office') {
            $pos = Po::with([
                'items' => function ($q) {
                    $q->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty')
                        ->with(['itemProgresses', 'alerts']);
                },
            ])->get();
            $alerts = Alert::with('item.po')->where('is_resolved', false)->get();
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
        ])->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty');

        if ($roleName === 'FINANCE') {
            $query->where(function ($q) {
                $q->whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
                    ->orWhere(function ($sub) {
                        $sub->where('status', 'COMPLETED')
                            ->where(function ($subFinance) {
                                $subFinance->where('invoice_status', '!=', 'INVOICED')
                                    ->orWhere('payment_status', '!=', 'PAID');
                            });
                    });
            });
        } else {
            $query->whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED']);
        }

        $items = $query->get();

        return Inertia::render('Worker/Dashboard', [
            'items' => $items,
            'auth_user' => $user,
            'tenant_id' => $tenant->id,
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
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized tenant access.');
        }

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
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized tenant access.');
        }

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

    public function exportPdf(Request $request, $slug)
    {
        // 1. Resolve tenant context by slug
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->first();
        if (! $tenant) {
            abort(404, 'Tenant not found.');
        }
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        // 2. Auth check
        if (! auth()->check()) {
            abort(401);
        }

        // 3. Tenant matching check
        $user = auth()->user();
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized tenant access.');
        }

        // 4. Role check
        $user->load('roleRelation');
        if ($user->role_level !== 'office') {
            abort(403, 'Unauthorized role.');
        }

        $range = $request->input('range', 'month');
        if (! in_array($range, ['week', 'month', 'year'])) {
            $range = 'month';
        }
        $telemetry = $this->getTelemetryData($range);

        $pdf = Pdf::loadView('pdf.performance-matrix', [
            'tenant' => $tenant,
            'telemetry' => $telemetry,
            'range' => $range,
            'generated_at' => now()->format('Y-m-d H:i:s'),
        ]);

        return $pdf->download("performance-matrix-{$range}.pdf");
    }

    public function exportCsv(Request $request, $slug)
    {
        [$tenant] = $this->resolveTenantAuth($request, $slug);

        $range = $request->input('range', 'month');
        if (! in_array($range, ['week', 'month', 'year'])) {
            $range = 'month';
        }
        $telemetry = $this->getTelemetryData($range);

        $filename = "performance-matrix-{$range}-".now()->format('Ymd').'.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($telemetry) {
            $handle = fopen('php://output', 'w');

            // BOM for Excel UTF-8
            fwrite($handle, "\xEF\xBB\xBF");

            // ── Summary Section ──
            fputcsv($handle, ['KPI Summary', '', '']);
            fputcsv($handle, ['OTDR (%)', $telemetry['otdr'], '']);
            fputcsv($handle, ['Manufacture Delivered', $telemetry['manufacture']['delivered'], 'Target: '.$telemetry['manufacture']['target']]);
            fputcsv($handle, ['Buyout Completed', $telemetry['buyout']['completed'], 'Target: '.$telemetry['buyout']['target']]);
            fputcsv($handle, ['Service Completed', $telemetry['service']['completed'], 'Target: '.$telemetry['service']['target']]);
            fputcsv($handle, ['Active Risks (Red)', $telemetry['risks']['red'], '']);
            fputcsv($handle, ['Active Risks (Yellow)', $telemetry['risks']['yellow'], '']);
            fputcsv($handle, ['Avg Delay (Days)', $telemetry['avg_delay_days'], '']);
            fputcsv($handle, ['Urgent Active POs', $telemetry['urgent_active'], '']);
            fputcsv($handle, ['Uninvoiced Items', $telemetry['finance_health']['uninvoiced_count'], '']);
            fputcsv($handle, ['Unpaid Items', $telemetry['finance_health']['unpaid_count'], '']);
            fputcsv($handle, ['', '', '']);

            // ── All Items Directory ──
            fputcsv($handle, ['All Items Directory', '', '', '', '', '', '', '', '', '', '', '']);
            $itemHeaders = [
                'PO Number', 'Client', 'Item Name', 'Status', 'PO Status', 'Progress (%)',
                'Deadline', 'Days Overdue', 'Current Stage', 'Reason',
                'Target Qty', 'Delivered Qty', 'Invoice Status', 'Payment Status',
                'On Time', 'Urgent',
            ];
            fputcsv($handle, $itemHeaders);

            foreach ($telemetry['all_items'] as $item) {
                fputcsv($handle, [
                    $item['po_number'],
                    $item['client_name'],
                    $item['item_name'],
                    $item['status'],
                    $item['po_status'],
                    $item['progress_percent'],
                    $item['global_deadline'],
                    $item['days_overdue'],
                    $item['current_stage'] ?? '',
                    $item['reason'] ?? '',
                    $item['target_qty'],
                    $item['delivered_qty'],
                    $item['invoice_status'],
                    $item['payment_status'],
                    $item['is_on_time'] ? 'Yes' : 'No',
                    $item['is_urgent'] ? 'Yes' : 'No',
                ]);
            }

            fputcsv($handle, ['', '', '']);

            // ── Client Health ──
            fputcsv($handle, ['Client Health', '', '', '', '', '', '', '']);
            $clientHeaders = [
                'Client', 'Active POs', 'Completed Total', 'On-Time Rate (%)',
                'Overdue Items', 'Uninvoiced', 'Unpaid', 'Risk Score',
            ];
            fputcsv($handle, $clientHeaders);

            foreach ($telemetry['client_health'] as $client) {
                fputcsv($handle, [
                    $client['client_name'],
                    $client['active_pos'],
                    $client['completed_total'],
                    $client['on_time_rate'] ?? 'N/A',
                    $client['overdue_items'],
                    $client['uninvoiced_count'],
                    $client['unpaid_count'],
                    $client['risk_score'],
                ]);
            }

            fputcsv($handle, ['', '', '']);

            // ── Stage Metrics ──
            fputcsv($handle, ['Stage Metrics (Bottleneck Analysis)', '', '', '', '']);
            $stageHeaders = ['Stage', 'Active Items', 'Stuck Count', 'Rework Count', 'Avg Cycle Time (Days)'];
            fputcsv($handle, $stageHeaders);

            foreach ($telemetry['stage_metrics'] as $stage) {
                fputcsv($handle, [
                    $stage['stage'],
                    $stage['active_items'],
                    $stage['stuck_count'],
                    $stage['rework_count'],
                    $stage['avg_cycle_time'],
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportXlsx(Request $request, $slug)
    {
        [$tenant] = $this->resolveTenantAuth($request, $slug);

        $range = $request->input('range', 'month');
        if (! in_array($range, ['week', 'month', 'year'])) {
            $range = 'month';
        }
        $telemetry = $this->getTelemetryData($range);

        $filename = "performance-matrix-{$range}-".now()->format('Ymd').'.xlsx';

        $headers = [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($telemetry) {
            $writer = new Writer;
            $writer->openToFile('php://output');

            $boldStyle = (new Style)
                ->withFontBold(true);

            // ── Sheet 1: KPI Summary ──
            $sheet1 = $writer->getCurrentSheet();
            $sheet1->setName('KPI Summary');

            $writer->addRow(Row::fromValuesWithStyle(['Metric', 'Value', 'Note'], $boldStyle));
            $writer->addRow(Row::fromValues(['OTDR (%)', $telemetry['otdr'], '']));
            $writer->addRow(Row::fromValues(['Manufacture Delivered', $telemetry['manufacture']['delivered'], 'Target: '.$telemetry['manufacture']['target']]));
            $writer->addRow(Row::fromValues(['Buyout Completed', $telemetry['buyout']['completed'], 'Target: '.$telemetry['buyout']['target']]));
            $writer->addRow(Row::fromValues(['Service Completed', $telemetry['service']['completed'], 'Target: '.$telemetry['service']['target']]));
            $writer->addRow(Row::fromValues(['Active Risks (Red)', $telemetry['risks']['red'], '']));
            $writer->addRow(Row::fromValues(['Active Risks (Yellow)', $telemetry['risks']['yellow'], '']));
            $writer->addRow(Row::fromValues(['Avg Delay (Days)', $telemetry['avg_delay_days'], '']));
            $writer->addRow(Row::fromValues(['Urgent Active POs', $telemetry['urgent_active'], '']));
            $writer->addRow(Row::fromValues(['Uninvoiced Items', $telemetry['finance_health']['uninvoiced_count'], '']));
            $writer->addRow(Row::fromValues(['Unpaid Items', $telemetry['finance_health']['unpaid_count'], '']));

            // ── Sheet 2: All Items Directory ──
            $writer->addNewSheetAndMakeItCurrent();
            $sheet2 = $writer->getCurrentSheet();
            $sheet2->setName('All Items');

            $writer->addRow(Row::fromValuesWithStyle([
                'PO Number', 'Client', 'Item Name', 'Status', 'PO Status', 'Progress (%)',
                'Deadline', 'Days Overdue', 'Current Stage', 'Reason',
                'Target Qty', 'Delivered Qty', 'Invoice Status', 'Payment Status',
                'On Time', 'Urgent',
            ], $boldStyle));

            foreach ($telemetry['all_items'] as $item) {
                $writer->addRow(Row::fromValues([
                    $item['po_number'],
                    $item['client_name'],
                    $item['item_name'],
                    $item['status'],
                    $item['po_status'],
                    $item['progress_percent'],
                    $item['global_deadline'],
                    $item['days_overdue'],
                    $item['current_stage'] ?? '',
                    $item['reason'] ?? '',
                    $item['target_qty'],
                    $item['delivered_qty'],
                    $item['invoice_status'],
                    $item['payment_status'],
                    $item['is_on_time'] ? 'Yes' : 'No',
                    $item['is_urgent'] ? 'Yes' : 'No',
                ]));
            }

            // ── Sheet 3: Client Health ──
            $writer->addNewSheetAndMakeItCurrent();
            $sheet3 = $writer->getCurrentSheet();
            $sheet3->setName('Client Health');

            $writer->addRow(Row::fromValuesWithStyle([
                'Client', 'Active POs', 'Completed Total', 'On-Time Rate (%)',
                'Overdue Items', 'Uninvoiced', 'Unpaid', 'Risk Score',
            ], $boldStyle));

            foreach ($telemetry['client_health'] as $client) {
                $writer->addRow(Row::fromValues([
                    $client['client_name'],
                    $client['active_pos'],
                    $client['completed_total'],
                    $client['on_time_rate'] ?? 'N/A',
                    $client['overdue_items'],
                    $client['uninvoiced_count'],
                    $client['unpaid_count'],
                    $client['risk_score'],
                ]));
            }

            // ── Sheet 4: Stage Metrics ──
            $writer->addNewSheetAndMakeItCurrent();
            $sheet4 = $writer->getCurrentSheet();
            $sheet4->setName('Stage Metrics');

            $writer->addRow(Row::fromValuesWithStyle([
                'Stage', 'Active Items', 'Stuck Count', 'Rework Count', 'Avg Cycle Time (Days)',
            ], $boldStyle));

            foreach ($telemetry['stage_metrics'] as $stage) {
                $writer->addRow(Row::fromValues([
                    $stage['stage'],
                    $stage['active_items'],
                    $stage['stuck_count'],
                    $stage['rework_count'],
                    $stage['avg_cycle_time'],
                ]));
            }

            $writer->close();
        };

        return response()->stream($callback, 200, $headers);
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
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized tenant access.');
        }

        $user->load('roleRelation');
        if ($user->role_level !== 'office') {
            abort(403, 'Unauthorized role.');
        }

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
        // Use real DoItem.delivered_qty for MANUFACTURE items in range.
        // BUY_OUT and SERVICE still use progress-estimate (no DO flow for them).
        $items = Item::where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate)
            ->with(['doItems'])
            ->get();

        $deliveredManufacture = 0;
        $targetManufacture = 0;
        $outputBuyout = 0.0;
        $targetBuyout = 0;
        $outputService = 0.0;
        $targetService = 0;

        foreach ($items as $item) {
            $prog = (float) $item->progress_percent;
            if ($item->item_type === 'MANUFACTURE') {
                // Real delivered quantity from DoItems
                $deliveredManufacture += $item->doItems->sum('delivered_qty');
                $targetManufacture += $item->target_qty;
            } elseif ($item->item_type === 'BUY_OUT') {
                $outputBuyout += $item->target_qty * ($prog / 100.0);
                $targetBuyout += $item->target_qty;
            } elseif ($item->item_type === 'SERVICE') {
                $outputService += $item->target_qty * ($prog / 100.0);
                $targetService += $item->target_qty;
            }
        }

        // Previous period manufacture for delta comparison
        $prevItems = Item::where('created_at', '>=', $prevStartDate)
            ->where('created_at', '<=', $prevEndDate)
            ->where('item_type', 'MANUFACTURE')
            ->with(['doItems'])
            ->get();
        $prevDeliveredManufacture = $prevItems->sum(fn ($i) => $i->doItems->sum('delivered_qty'));
        $prevTargetManufacture = $prevItems->sum('target_qty');

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
                ->whereNotNull('updated_at')
                ->get();

            $totalDays = 0.0;
            $completedCount = 0;
            foreach ($completedStages as $cs) {
                $created = Carbon::parse($cs->created_at);
                $updated = Carbon::parse($cs->updated_at);
                $totalDays += $updated->diffInHours($created) / 24.0;
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

                $daysOverdue = now()->startOfDay()->gt($deadline) ? now()->startOfDay()->diffInDays($deadline) : 0;

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
                    $daysOverdue = $completionDate->diffInDays($deadline);
                }
            } else {
                if (now()->startOfDay()->gt($deadline)) {
                    $daysOverdue = now()->startOfDay()->diffInDays($deadline);
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
            if ($daysOverdue > 0 || $currentStage === 'Finance') {
                $stuckProgress = $item->itemProgresses->firstWhere('status', 'STUCK');
                $stuckAlert = $item->alerts->first(fn ($a) => ! $a->is_resolved && $a->severity === 'RED');
                $reworkAlert = $item->alerts->first(fn ($a) => ! $a->is_resolved && $a->severity === 'YELLOW');

                if ($stuckAlert) {
                    $reason = $stuckAlert->message;
                } elseif ($reworkAlert) {
                    $reason = $reworkAlert->message;
                } elseif ($stuckProgress) {
                    $reason = "Stuck on stage '{$stuckProgress->stage_name}'";
                } elseif ($item->invoice_status === 'UNINVOICED') {
                    $reason = 'Uninvoiced';
                } elseif ($item->payment_status === 'UNPAID') {
                    $reason = 'Unpaid';
                } else {
                    $reason = 'Delayed';
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

    private function calcOtdr(Carbon $startDate, Carbon $endDate): float
    {
        $posCompleted = Po::where('status', 'COMPLETED')
            ->whereBetween('global_deadline', [$startDate->toDateString(), $endDate->toDateString()])
            ->with(['deliveryOrders'])
            ->get();

        $totalCompleted = $posCompleted->count();
        $onTimeCompleted = 0;

        foreach ($posCompleted as $po) {
            $deadline = Carbon::parse($po->global_deadline)->startOfDay();
            $latestDoDate = $po->deliveryOrders->max('delivery_date');
            if ($latestDoDate) {
                $latestDo = Carbon::parse($latestDoDate)->startOfDay();
                if ($latestDo->lte($deadline)) {
                    $onTimeCompleted++;
                }
            } else {
                // No DO recorded: use PO updated_at as fallback
                if ($po->updated_at->startOfDay()->lte($deadline)) {
                    $onTimeCompleted++;
                }
            }
        }

        return $totalCompleted > 0 ? round(($onTimeCompleted / $totalCompleted) * 100, 1) : 100.0;
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
                    $totalDelayDays += $completionDate->diffInDays($deadline);
                    $delayedCount++;
                }
            } else {
                if (now()->startOfDay()->gt($deadline)) {
                    $totalDelayDays += now()->startOfDay()->diffInDays($deadline);
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

        return back()->with('success', 'Last progress update reverted successfully.');
    }

    public function reportKendala(Request $request, $slug, $progressId)
    {
        $request->validate([
            'kendala_type' => ['required', 'string'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);
        $this->validateStageAccess($progress, auth()->user());

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
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized tenant access.');
        }

        // Fetch all alerts for this tenant (resolved and unresolved)
        $alerts = Alert::with(['item.po'])
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Worker/TroubleReports', [
            'alerts' => $alerts,
            'auth_user' => $user,
            'tenant' => $tenant,
        ]);
    }

    public function logQcRework(Request $request, $slug, $progressId)
    {
        $request->validate([
            'reject_qty' => ['required', 'integer', 'min:1'],
        ]);

        $user = auth()->user()->load('roleRelation');
        if ($user->role_level !== 'office' && $user->role_name !== 'QC') {
            abort(403, 'Forbidden: Only QC inspectors can log rework.');
        }

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

        // Create a YELLOW alert with structured reason_type
        $alert = Alert::create([
            'tenant_id' => TenantManager::getTenantId(),
            'item_id' => $item->id,
            'user_id' => $user->id,
            'severity' => 'YELLOW',
            'reason_type' => 'QC Rework',
            'message' => "QC Rework: {$request->reject_qty} items rejected on stage '{$progress->stage_name}' for item '{$item->item_name}' (PO: {$po->po_number}).",
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

        if ($user->role_level !== 'office' && $userRoleName !== 'DRAFTER') {
            abort(403, 'Forbidden: Only Drafters can update drafter status.');
        }

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

        return back()->with('success', 'Drafter status updated.');
    }

    public function updatePurchasingStatus(Request $request, $slug, $itemId)
    {
        $request->validate([
            'purchasing_status' => ['required', 'string', 'in:ORDER,PROSES,READY'],
        ]);

        $user = auth()->user()->load('roleRelation');

        if ($user->role_level !== 'office' && $user->role_name !== 'PURCHASING') {
            abort(403, 'Forbidden: Only Purchasing agents can update purchasing status.');
        }

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

        $item->update(['purchasing_status' => $request->purchasing_status]);

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
        if ($user->role_level !== 'office' && $user->role_name !== 'FINANCE') {
            abort(403, 'Forbidden: Only Finance controllers can update finance status.');
        }

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
            if ($item->delivery_status === 'PENDING') {
                abort(403, 'Stage locked: Finance status cannot be updated until at least one item has been delivered.');
            }
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

        return back()->with('success', 'Finance status updated.');
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
                        abort(403, "Stage locked: Only {$rolesStr} operators can update this stage.");
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
                    abort(403, 'Stage locked: This is a Vendor job, so other production stages are locked.');
                }
            }

            if ($isMachiningChecked && ! $isFabricationChecked) {
                if (str_contains($stageNameLower, 'fabrication') || str_contains($stageNameLower, 'fabrikasi')) {
                    abort(403, 'Stage locked: Fabrication is not required/checked for this item.');
                }
            }

            if ($isFabricationChecked && ! $isMachiningChecked) {
                if (str_contains($stageNameLower, 'machining')) {
                    abort(403, 'Stage locked: Machining is not required/checked for this item.');
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
                    abort(403, 'Stage locked: Production requires Design/Drawing to be completed/approved.');
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
                    abort(403, 'Stage locked: Production requires Material/Bahan to be ready/completed.');
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
                            abort(403, "Stage locked: QC requires all preceding stages to be COMPLETED first. ({$stage->stage_name} is not done yet)");
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
                    abort(403, 'Stage locked: Delivery cannot be updated until QC stage has completed quantities.');
                }
            }
        }
    }
}
