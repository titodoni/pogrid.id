<?php

namespace App\Http\Controllers;

use App\Events\ProductionTerminated;
use App\Jobs\GenerateSunkCostInvoiceJob;
use App\Models\Alert;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Post;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantStageTemplate;
use App\Models\User;
use App\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class OwnerDashboardController extends Controller
{
    public function index()
    {
        if (auth()->check()) {
            $tenant = Tenant::find(TenantManager::getTenantId());
            if ($tenant) {
                return redirect("/c/{$tenant->slug}");
            }
        }

        return redirect('/login');
    }

    public function updateCompany(Request $request)
    {
        $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
        ]);

        $tenant = Tenant::find(TenantManager::getTenantId());
        $tenant->update([
            'company_name' => $request->company_name,
        ]);

        return back()->with('success', 'Company settings updated successfully.');
    }

    public function updateWorkflowSettings(Request $request)
    {
        $request->validate([
            'workflow_mode' => ['required', 'string', 'in:strict,loose,custom'],
            'require_design_approved_for_production' => ['nullable', 'boolean'],
            'require_material_ready_for_production' => ['nullable', 'boolean'],
            'require_production_completed_for_qc' => ['nullable', 'boolean'],
            'require_qc_completed_for_delivery' => ['nullable', 'boolean'],
            'require_delivery_for_finance' => ['nullable', 'boolean'],
        ]);

        $tenant = Tenant::find(TenantManager::getTenantId());

        $settings = [
            'workflow_mode' => $request->workflow_mode,
            'require_design_approved_for_production' => (bool) $request->input('require_design_approved_for_production', false),
            'require_material_ready_for_production' => (bool) $request->input('require_material_ready_for_production', false),
            'require_production_completed_for_qc' => (bool) $request->input('require_production_completed_for_qc', true),
            'require_qc_completed_for_delivery' => (bool) $request->input('require_qc_completed_for_delivery', true),
            'require_delivery_for_finance' => (bool) $request->input('require_delivery_for_finance', true),
        ];

        $tenant->update([
            'workflow_settings' => $settings,
        ]);

        return back()->with('success', 'Workflow settings updated successfully.');
    }

    public function create()
    {
        $user = auth()->user();

        if ($user->isOwner()) {
            abort(403, 'Owners cannot create or broadcast POs. Please assign an Admin user.');
        }

        // Ensure tenant context is set for this request
        TenantManager::setTenantId($user->tenant_id);

        $recentPos = Po::with('items')
            ->latest()
            ->take(20)
            ->get()
            ->map(function ($po) {
                return [
                    'id' => $po->id,
                    'po_number' => $po->po_number,
                    'client_name' => $po->client_name,
                    'is_urgent' => (bool) $po->is_urgent,
                    'created_at' => $po->created_at?->toDateString(),
                    'items' => $po->items->map(function ($item) {
                        return [
                            'item_name' => $item->item_name,
                            'item_type' => $item->item_type,
                            'target_qty' => $item->target_qty,
                            'required_stages' => $item->required_stages,
                            'vendor_name' => $item->vendor_name,
                            'vendor_phone' => $item->vendor_phone,
                        ];
                    })->values(),
                ];
            });

        $stageTemplates = TenantStageTemplate::where('tenant_id', TenantManager::getTenantId())
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $t->description,
                'stages' => $t->stages,
            ]);

        return Inertia::render('Owner/CreatePo', [
            'tenant' => $user->tenant,
            'auth_user' => $user,
            'recent_pos' => $recentPos,
            'stage_templates' => $stageTemplates,
        ]);
    }

    public function createPo(Request $request)
    {
        $user = auth()->user();

        if ($user->isOwner()) {
            abort(403, 'Owners cannot create or broadcast POs. Please assign an Admin user.');
        }

        // Ensure tenant context for this request
        TenantManager::setTenantId($user->tenant_id);

        $request->validate([
            'po_number' => [
                'required',
                'string',
                Rule::unique('pos')->where('tenant_id', $user->tenant_id),
            ],
            'external_po_number' => ['nullable', 'string', 'max:255'],
            'client_name' => ['required', 'string', 'max:255'],
            'global_deadline_relative' => ['nullable', 'string', 'in:3 days,1 week,1 month'],
            'global_deadline' => [
                Rule::requiredIf(! $request->filled('global_deadline_relative')),
                'nullable',
                'date',
            ],
            'is_urgent' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_name' => ['required', 'string', 'max:255'],
            'items.*.item_type' => ['required', 'in:MANUFACTURE,BUY_OUT,SERVICE'],
            'items.*.target_qty' => ['required', 'integer', 'min:1'],
            'items.*.required_stages' => ['required', 'array', 'min:1'],
            'items.*.required_stages.*' => ['required', 'string'],
            'items.*.vendor_name' => ['nullable', 'string', 'max:255'],
            'items.*.vendor_phone' => ['nullable', 'string', 'max:255'],
        ]);

        if ($request->filled('global_deadline')) {
            $deadline = Carbon::parse($request->input('global_deadline'));
        } else {
            $relative = $request->input('global_deadline_relative');
            if ($relative === '3 days') {
                $deadline = now()->addDays(3);
            } elseif ($relative === '1 week') {
                $deadline = now()->addWeeks(1);
            } elseif ($relative === '1 month') {
                $deadline = now()->addMonths(1);
            } else {
                $deadline = now()->addDays(3);
            }
        }

        DB::transaction(function () use ($request, $deadline) {
            $po = Po::create([
                'tenant_id' => TenantManager::getTenantId(),
                'po_number' => $request->po_number,
                'external_po_number' => $request->external_po_number,
                'client_name' => $request->client_name,
                'global_deadline' => $deadline->toDateString(),
                'status' => 'PENDING',
                'is_urgent' => (bool) $request->is_urgent,
            ]);

            foreach ($request->items as $itemData) {
                Item::create([
                    'tenant_id' => TenantManager::getTenantId(),
                    'po_id' => $po->id,
                    'item_name' => $itemData['item_name'],
                    'item_type' => $itemData['item_type'],
                    'target_qty' => $itemData['target_qty'],
                    'required_stages' => $itemData['required_stages'],
                    'status' => 'PENDING',
                    'vendor_name' => $itemData['vendor_name'] ?? null,
                    'vendor_phone' => $itemData['vendor_phone'] ?? null,
                ]);
            }
        });

        $tenantSlug = $user->tenant->slug;

        return redirect("/c/{$tenantSlug}")->with('success', 'Purchase Order broadcasted successfully.');
    }

    public function createUser(Request $request)
    {
        $authUser = auth()->user()->loadMissing('roleRelation');

        // OWNER can only create ADMIN users
        if ($authUser->isOwner()) {
            $adminRoleId = Role::where('name', 'STAFF')->value('id');
            $adminPostId = Post::where('name', 'Admin')->value('id');
            $request->merge([
                'role_id' => $adminRoleId,
                'post_id' => $adminPostId,
                'login_method' => 'PASSWORD',
            ]);
        }

        $loginMethod = $request->input('login_method');
        if (! $loginMethod) {
            if ($request->filled('pin')) {
                $loginMethod = 'PIN';
            } else {
                $loginMethod = 'PASSWORD';
            }
        }
        $request->merge(['login_method' => $loginMethod]);

        $rules = [
            'login_method' => ['required', 'in:PASSWORD,PIN'],
            'name' => ['required', 'string', 'max:255'],
            'role_id' => ['required', 'exists:roles,id'],
            'post_id' => ['nullable', 'exists:posts,id'],
            'username' => [
                Rule::requiredIf($request->login_method === 'PASSWORD'),
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                'unique:users,username',
            ],
            'password' => [
                Rule::requiredIf($request->login_method === 'PASSWORD'),
                'nullable',
                'string',
                'min:6',
            ],
            'pin' => [
                Rule::requiredIf($request->login_method === 'PIN'),
                'nullable',
                'string',
                'min:4',
                'max:6',
                'regex:/^[0-9]+$/',
            ],
        ];

        if ($authUser->isOwner()) {
            $rules['role_id'] = ['required', Rule::exists('roles', 'id')->where(function ($q) {
                $q->where('name', 'STAFF');
            })];
        }

        $request->validate($rules);

        $userData = [
            'tenant_id' => TenantManager::getTenantId(),
            'name' => $request->name,
            'role_id' => $request->role_id,
            'post_id' => $request->post_id,
        ];

        if ($request->login_method === 'PASSWORD') {
            $userData['username'] = $request->username;
            $userData['password'] = bcrypt($request->password);
            $userData['pin'] = null;
        } else {
            $userData['pin'] = bcrypt($request->pin);
            $userData['username'] = null;
            $userData['password'] = null;
        }

        User::create($userData);

        return back()->with('success', 'User created successfully.');
    }

    public function updateUser(Request $request, $userId)
    {
        $user = User::findOrFail($userId);

        $loginMethod = $request->input('login_method');
        if (! $loginMethod) {
            if ($request->filled('pin') || (! $request->filled('username') && $user->pin)) {
                $loginMethod = 'PIN';
            } else {
                $loginMethod = 'PASSWORD';
            }
        }
        $request->merge(['login_method' => $loginMethod]);

        $request->validate([
            'login_method' => ['required', 'in:PASSWORD,PIN'],
            'name' => ['required', 'string', 'max:255'],
            'role_id' => ['required', 'exists:roles,id'],
            'post_id' => ['nullable', 'exists:posts,id'],
            'username' => [
                Rule::requiredIf($request->login_method === 'PASSWORD'),
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('users', 'username')->ignore($user->id),
            ],
            'password' => [
                'nullable',
                'string',
                'min:6',
            ],
            'pin' => [
                'nullable',
                'string',
                'min:4',
                'max:6',
                'regex:/^[0-9]+$/',
            ],
        ]);

        $user->name = $request->name;
        $user->role_id = $request->role_id;
        $user->post_id = $request->post_id;

        if ($request->login_method === 'PASSWORD') {
            $user->username = $request->username;
            if ($request->filled('password')) {
                $user->password = bcrypt($request->password);
            }
            $user->pin = null;
        } else {
            if ($request->filled('pin')) {
                $user->pin = bcrypt($request->pin);
            }
            $user->username = null;
            $user->password = null;
        }

        $user->save();

        return back()->with('success', 'User updated successfully.');
    }

    public function deleteUser(Request $request, $userId)
    {
        $user = User::findOrFail($userId);

        if ($user->id === auth()->id()) {
            abort(403, 'You cannot delete yourself.');
        }

        $user->delete();

        return back()->with('success', 'User deleted successfully.');
    }

    public function cancelItem(Request $request, $itemId)
    {
        $item = Item::findOrFail($itemId);

        // Business guard: IF Item Progress > 0% -> Returns HTTP 403 Forbidden
        if ((float) $item->progress_percent > 0.00) {
            abort(403, 'Sunk-Cost Cancel Protection: Items with progress > 0% cannot be cancelled. You must terminate midway instead.');
        }

        $item->update(['status' => 'CANCELLED']);

        return back()->with('success', 'Item cancelled successfully.');
    }

    public function terminateMidway(Request $request, $itemId)
    {
        $item = Item::findOrFail($itemId);
        $item->update(['status' => 'TERMINATED']);

        // Freeze worker mobile screens via Pusher/Echo
        broadcast(new ProductionTerminated($item))->toOthers();

        // Calculate completed pieces (average across stages to prevent skewing)
        $stages = $item->itemProgresses()->get();
        $totalCompleted = $stages->sum('completed_qty');
        $stagesCount = $stages->count();
        $completedPieces = $stagesCount > 0 ? (int) round($totalCompleted / $stagesCount) : 0;

        // Dispatch mandatory billing job to Finance
        GenerateSunkCostInvoiceJob::dispatch($item->id, $completedPieces);

        return back()->with('success', 'Production halted. Sunk-cost recovery billing task dispatched.');
    }

    public function batchAction(Request $request)
    {
        $request->validate([
            'action' => ['required', 'in:cancel,terminate'],
            'item_ids' => ['required', 'array', 'min:1'],
            'item_ids.*' => ['required', 'integer', 'exists:items,id'],
        ]);

        $action = $request->input('action');
        $itemIds = $request->input('item_ids');
        $results = ['cancelled' => 0, 'terminated' => 0, 'errors' => []];

        foreach ($itemIds as $itemId) {
            try {
                $item = Item::findOrFail($itemId);

                if ($action === 'cancel') {
                    if ((float) $item->progress_percent > 0.00) {
                        $results['errors'][] = "Item {$item->item_name}: has progress > 0%, cannot cancel.";

                        continue;
                    }
                    $item->update(['status' => 'CANCELLED']);
                    $results['cancelled']++;
                } elseif ($action === 'terminate') {
                    $item->update(['status' => 'TERMINATED']);
                    ProductionTerminated::dispatch($item);
                    $results['terminated']++;
                }
            } catch (\Exception $e) {
                $results['errors'][] = "Item {$itemId}: {$e->getMessage()}";
            }
        }

        $message = "Batch action '{$action}' completed: {$results['cancelled']} cancelled, {$results['terminated']} terminated.";
        if (! empty($results['errors'])) {
            $message .= ' Errors: '.implode('; ', $results['errors']);
        }

        return back()->with('success', $message);
    }

    public function listStageTemplates()
    {
        $templates = TenantStageTemplate::where('tenant_id', TenantManager::getTenantId())
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $t->description,
                'stages' => $t->stages,
                'sort_order' => $t->sort_order,
            ]);

        return response()->json(['templates' => $templates]);
    }

    public function createStageTemplate(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'stages' => ['required', 'array', 'min:1'],
            'stages.*' => ['required', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $template = TenantStageTemplate::create([
            'tenant_id' => TenantManager::getTenantId(),
            'name' => $request->name,
            'description' => $request->description,
            'stages' => $request->stages,
            'sort_order' => $request->sort_order ?? 0,
        ]);

        return back()->with('success', 'Stage template created successfully.');
    }

    public function updateStageTemplate(Request $request, $templateId)
    {
        $template = TenantStageTemplate::where('tenant_id', TenantManager::getTenantId())
            ->findOrFail($templateId);

        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'stages' => ['required', 'array', 'min:1'],
            'stages.*' => ['required', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $template->update([
            'name' => $request->name,
            'description' => $request->description,
            'stages' => $request->stages,
            'sort_order' => $request->sort_order ?? 0,
        ]);

        return back()->with('success', 'Stage template updated successfully.');
    }

    public function deleteStageTemplate(Request $request, $templateId)
    {
        $template = TenantStageTemplate::where('tenant_id', TenantManager::getTenantId())
            ->findOrFail($templateId);

        $template->delete();

        return back()->with('success', 'Stage template deleted successfully.');
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = auth()->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return back()->withErrors([
                'current_password' => 'Current password is incorrect.',
            ]);
        }

        $user->password = bcrypt($request->new_password);
        $user->save();

        return back()->with('success', 'Password changed successfully.');
    }

    public function reworkLogbook(Request $request)
    {
        $range = $request->input('range', 'month');
        if (! in_array($range, ['week', 'month', 'year', 'all'])) {
            $range = 'month';
        }

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

        return Inertia::render('Owner/ReworkLogbook', [
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
            'selected_range' => $range,
        ]);
    }
}
