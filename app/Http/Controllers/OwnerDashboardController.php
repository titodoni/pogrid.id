<?php

namespace App\Http\Controllers;

use App\Events\ProductionTerminated;
use App\Events\TaskUpdated;
use App\Jobs\GenerateSunkCostInvoiceJob;
use App\Models\Item;
use App\Models\PaymentMethod;
use App\Models\Plan;
use App\Models\PlatformActivityLog;
use App\Models\Po;
use App\Models\Post;
use App\Models\Role;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\TenantStageTemplate;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Services\DrafterRoutingService;
use App\Services\DuitkuService;
use App\Services\PartCatalogService;
use App\Services\ReportingService;
use App\Services\StageTemplateService;
use App\Services\TenantManager;
use App\Services\TenantSettingsService;
use App\Services\UserManagementService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
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

    public function welcome()
    {
        $tenant = Tenant::find(TenantManager::getTenantId());

        if (! $tenant) {
            return redirect('/login');
        }

        return Inertia::render('Owner/Onboarding', [
            'tenant' => [
                'company_name' => $tenant->company_name,
                'slug' => $tenant->slug,
                'logo_path' => $tenant->logo_path,
                'theme' => $tenant->theme ?? 'theme-default',
            ],
        ]);
    }

    public function updateCompany(Request $request, TenantSettingsService $settings)
    {
        Gate::authorize('manage-company-settings');

        $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'theme' => ['nullable', 'string', 'max:50'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ]);

        $settings->updateCompany($request->company_name, $request->theme, $request->file('logo'));

        return back()->with('success', 'Company settings updated successfully.');
    }

    public function updateWorkflowSettings(Request $request, TenantSettingsService $settings)
    {
        Gate::authorize('manage-workflow-settings');

        $data = $request->validate([
            'workflow_mode' => ['required', 'string', 'in:strict,loose,custom'],
            'require_design_approved_for_production' => ['nullable', 'boolean'],
            'require_material_ready_for_production' => ['nullable', 'boolean'],
            'require_production_completed_for_qc' => ['nullable', 'boolean'],
            'require_qc_completed_for_delivery' => ['nullable', 'boolean'],
            'require_delivery_for_finance' => ['nullable', 'boolean'],
        ]);

        $settings->updateWorkflowSettings($data);

        return back()->with('success', 'Workflow settings updated successfully.');
    }

    public function create(PartCatalogService $partCatalog)
    {
        $user = auth()->user();

        $this->authorize('create', Po::class);

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

        $historicalItems = Item::where('tenant_id', TenantManager::getTenantId())
            ->whereNotIn('status', ['CANCELLED', 'TERMINATED'])
            ->with('po:id,client_name')
            ->latest('id')
            ->take(100)
            ->get()
            ->map(function ($item) {
                return [
                    'client_name' => $item->po?->client_name ?? '',
                    'item_name' => $item->item_name,
                    'item_type' => $item->item_type,
                    'target_qty' => (int) $item->target_qty,
                    'required_stages' => is_array($item->required_stages) ? $item->required_stages : [],
                    'vendor_name' => $item->vendor_name,
                    'vendor_phone' => $item->vendor_phone,
                ];
            })
            ->filter(fn ($i) => ! empty($i['client_name']) && ! empty($i['item_name']))
            ->values();

        return Inertia::render('Owner/CreatePo', [
            'tenant' => $user->tenant,
            'auth_user' => $user,
            'recent_pos' => $recentPos,
            'stage_templates' => $stageTemplates,
            'historical_items' => $historicalItems,
        ]);
    }

    public function createPo(Request $request)
    {
        $user = auth()->user();

        $this->authorize('create', Po::class);

        // Ensure tenant context for this request
        TenantManager::setTenantId($user->tenant_id);

        $tenant = Tenant::find($user->tenant_id);
        // Trial check is now in PoPolicy::create()

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
            'items.*.required_stages' => ['nullable', 'array'],
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

        DB::transaction(function () use ($request, $deadline, &$po) {
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
                $stages = $itemData['required_stages'] ?? null;
                if (empty($stages) || ! is_array($stages)) {
                    if ($itemData['item_type'] === 'BUY_OUT') {
                        $stages = ['Material', 'Vendor', 'QC', 'Delivery'];
                    } elseif ($itemData['item_type'] === 'SERVICE') {
                        $stages = ['Design'];
                    } else {
                        $stages = ['Design', 'Material', 'QC', 'Delivery'];
                    }
                }

                Item::create([
                    'tenant_id' => TenantManager::getTenantId(),
                    'po_id' => $po->id,
                    'item_name' => $itemData['item_name'],
                    'item_type' => $itemData['item_type'],
                    'target_qty' => $itemData['target_qty'],
                    'required_stages' => $stages,
                    'status' => 'PENDING',
                    'vendor_name' => $itemData['vendor_name'] ?? null,
                    'vendor_phone' => $itemData['vendor_phone'] ?? null,
                ]);
            }
        });

        broadcast(new TaskUpdated($user->tenant_id, "PO {$request->po_number} ({$request->client_name}) telah diterbitkan ke lantai produksi."))->toOthers();

        $tenantSlug = $user->tenant->slug;

        ActivityLogger::logPoCreated($po);

        return redirect("/c/{$tenantSlug}")->with('success', 'Purchase Order broadcasted successfully.');
    }

    public function createUser(Request $request, UserManagementService $users)
    {
        $authUser = auth()->user()->loadMissing('roleRelation');

        $this->authorize('manage', User::class);

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
                'min:8',
                'regex:/[0-9]/',
                'confirmed',
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

        $data = $request->validate($rules, [
            'password.min' => 'The password must be at least 8 characters.',
            'password.regex' => 'The password must contain at least one number.',
            'password.confirmed' => 'The password confirmation does not match.',
        ]);

        $users->create($data);

        return back()->with('success', 'User created successfully.');
    }

    public function updateUser(Request $request, $userId, UserManagementService $users)
    {
        $actor = auth()->user();

        $this->authorize('manage', User::class);

        $user = User::findOrFail($userId);

        // Only owners may modify owner accounts.
        $this->authorize('modifyOwner', $user);

        $loginMethod = $request->input('login_method');
        if (! $loginMethod) {
            if ($request->filled('pin') || (! $request->filled('username') && $user->pin)) {
                $loginMethod = 'PIN';
            } else {
                $loginMethod = 'PASSWORD';
            }
        }
        $request->merge(['login_method' => $loginMethod]);

        $data = $request->validate([
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

        $users->update($user, $data);

        return back()->with('success', 'User updated successfully.');
    }

    public function deleteUser(Request $request, $userId, UserManagementService $users)
    {
        $actor = auth()->user();

        $this->authorize('manage', User::class);

        $user = User::findOrFail($userId);

        // Only owners may delete owner accounts.
        $this->authorize('delete', $user);

        $users->delete($user);

        return back()->with('success', 'User deleted successfully.');
    }

    public function cancelItem(Request $request, $itemId)
    {
        $item = Item::findOrFail($itemId);

        $this->authorize('cancel', $item);

        // Business guard: IF Item Progress > 0% -> Returns HTTP 403 Forbidden
        // Sunk-cost check is now in ItemPolicy::cancel()

        $item->update(['status' => 'CANCELLED']);

        return back()->with('success', 'Item cancelled successfully.');
    }

    public function updateItemRouting(Request $request, $itemId, DrafterRoutingService $routingService)
    {
        $request->validate([
            'required_stages' => ['required', 'array', 'min:1'],
            'required_stages.*' => ['required', 'string'],
        ]);

        $item = Item::findOrFail($itemId);
        $this->authorize('update', $item);

        $routingService->updateRoutingOnly($item, $request->required_stages, auth()->user());

        return back()->with('success', 'Production routing updated successfully.');
    }

    public function terminateMidway(Request $request, $itemId)
    {
        $item = Item::findOrFail($itemId);
        $this->authorize('terminate', $item);
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
        $this->authorize('batchAction', Item::class);

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

    public function listStageTemplates(StageTemplateService $stageTemplates)
    {
        return response()->json(['templates' => $stageTemplates->listForTenant()]);
    }

    public function createStageTemplate(Request $request, StageTemplateService $stageTemplates)
    {
        Gate::authorize('manage-stage-templates');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'stages' => ['required', 'array', 'min:1'],
            'stages.*' => ['required', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $stageTemplates->create($data);

        return back()->with('success', 'Stage template created successfully.');
    }

    public function updateStageTemplate(Request $request, $templateId, StageTemplateService $stageTemplates)
    {
        Gate::authorize('manage-stage-templates');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'stages' => ['required', 'array', 'min:1'],
            'stages.*' => ['required', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $stageTemplates->update($templateId, $data);

        return back()->with('success', 'Stage template updated successfully.');
    }

    public function deleteStageTemplate(Request $request, $templateId, StageTemplateService $stageTemplates)
    {
        Gate::authorize('manage-stage-templates');

        $stageTemplates->delete($templateId);

        return back()->with('success', 'Stage template deleted successfully.');
    }

    public function changePassword(Request $request, UserManagementService $users)
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

        $users->changePassword($user, $request->new_password);

        return back()->with('success', 'Password changed successfully.');
    }

    public function reworkLogbook(Request $request, ReportingService $reporting)
    {
        $range = $request->input('range', 'month');
        if (! in_array($range, ['week', 'month', 'year', 'all'])) {
            $range = 'month';
        }

        $data = $reporting->reworkLogbook($range);

        return Inertia::render('Owner/ReworkLogbook', [
            'rework_events' => $data['rework_events'],
            'summary' => $data['summary'],
            'selected_range' => $range,
            'tenant' => Tenant::find(TenantManager::getTenantId()),
        ]);
    }

    public function createOnboardingAdmin(Request $request, UserManagementService $users)
    {
        $authUser = auth()->user();

        Gate::authorize('create-admin');

        // Ensure tenant context is set
        TenantManager::setTenantId($authUser->tenant_id);

        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
        ]);

        $adminRoleId = Role::where('name', 'STAFF')->value('id');
        $adminPostId = Post::where('name', 'Admin')->value('id');

        if (! $adminRoleId || ! $adminPostId) {
            return back()->withErrors(['email' => 'System roles/posts are not seeded correctly. Please run db seed.']);
        }

        $result = $users->createOnboardingAdmin($request->name, $request->email, $adminRoleId, $adminPostId);

        return back()->with('success', "Admin user {$result['user']->name} created successfully. Temporary password '{$result['temporary_password']}' has been sent to their email.");
    }

    public function billing(Request $request)
    {
        $user = auth()->user();
        TenantManager::setTenantId($user->tenant_id);

        $tenant = Tenant::with('plan')->find($user->tenant_id);

        $paymentMethods = TenantManager::runWithoutScope(
            fn () => PaymentMethod::active()->get(['id', 'name', 'type', 'provider', 'account_number', 'account_holder', 'instructions', 'config', 'sort_order'])
        );

        $openInvoice = TenantManager::runWithoutScope(
            fn () => SubscriptionInvoice::with('paymentMethod')
                ->where('tenant_id', $user->tenant_id)
                ->whereIn('status', [SubscriptionInvoice::STATUS_UNPAID, SubscriptionInvoice::STATUS_PENDING_VERIFICATION])
                ->latest('id')
                ->first()
        );

        $recentInvoices = TenantManager::runWithoutScope(
            fn () => SubscriptionInvoice::with('paymentMethod')
                ->where('tenant_id', $user->tenant_id)
                ->where('status', SubscriptionInvoice::STATUS_PAID)
                ->latest('paid_at')
                ->take(5)
                ->get()
        );

        return Inertia::render('Owner/Billing', [
            'tenant' => $tenant,
            'is_expired' => $tenant ? $tenant->isTrialExpired() : false,
            'payment_methods' => $paymentMethods,
            'open_invoice' => $openInvoice,
            'recent_invoices' => $recentInvoices,
        ]);
    }

    public function uploadPaymentProof(Request $request)
    {
        $user = auth()->user();
        TenantManager::setTenantId($user->tenant_id);

        $request->validate([
            'invoice_id' => ['nullable', 'exists:subscription_invoices,id'],
            'payment_method_id' => ['nullable', 'exists:payment_methods,id'],
            'proof' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'], // 5MB max
        ]);

        $tenant = Tenant::find($user->tenant_id);
        if (! $tenant) {
            abort(404);
        }

        $path = $request->file('proof')->store('payment_proofs', 'public');

        $invoice = TenantManager::runWithoutScope(function () use ($request, $tenant, $path) {
            $inv = null;
            if ($request->filled('invoice_id')) {
                $inv = SubscriptionInvoice::where('tenant_id', $tenant->id)->find($request->invoice_id);
            }

            if (! $inv) {
                // Find existing open invoice or create one
                $inv = SubscriptionInvoice::where('tenant_id', $tenant->id)
                    ->whereIn('status', [SubscriptionInvoice::STATUS_UNPAID, SubscriptionInvoice::STATUS_PENDING_VERIFICATION])
                    ->latest('id')
                    ->first();
            }

            if (! $inv) {
                $plan = $tenant->plan ?? Plan::first() ?? Plan::create(['name' => 'Langganan 1 Tahun', 'price' => 5_000_000_00]);
                $start = ($tenant->subscription_expires_at && $tenant->subscription_expires_at->isFuture())
                    ? $tenant->subscription_expires_at->copy()->addDay()->startOfDay()
                    : now()->startOfDay();
                $end = $start->copy()->addYear()->endOfDay();

                $inv = SubscriptionInvoice::create([
                    'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
                    'tenant_id' => $tenant->id,
                    'plan_id' => $plan->id,
                    'amount_cents' => $plan->price,
                    'status' => SubscriptionInvoice::STATUS_PENDING_VERIFICATION,
                    'due_date' => now()->addDays(7)->endOfDay(),
                    'period_start' => $start,
                    'period_end' => $end,
                    'notes' => 'Langganan Tahunan POgrid (1 Tahun Akses Penuh)',
                ]);
            }

            $inv->update([
                'payment_method_id' => $request->payment_method_id ?: $inv->payment_method_id,
                'payment_proof_path' => $path,
                'payment_proof_uploaded_at' => now(),
                'status' => SubscriptionInvoice::STATUS_PENDING_VERIFICATION,
            ]);

            return $inv;
        });

        PlatformActivityLog::create([
            'platform_admin_id' => null,
            'action' => 'invoice.proof_uploaded',
            'target_type' => SubscriptionInvoice::class,
            'target_id' => $invoice->id,
            'metadata' => [
                'tenant_slug' => $tenant->slug,
                'invoice_number' => $invoice->invoice_number,
            ],
        ]);

        return back()->with('success', 'Bukti transfer berhasil diunggah dan sedang menunggu verifikasi superadmin.');
    }

    public function logs(Request $request, ReportingService $reporting)
    {
        $user = auth()->user();
        TenantManager::setTenantId($user->tenant_id);

        $projectFilter = $request->integer('project_id') ?: null;

        $data = $reporting->activityLogs($projectFilter);

        return Inertia::render('Owner/Logs', [
            'logs' => $data['logs'],
            'projects' => $data['projects'],
            'selected_project' => $projectFilter,
        ]);
    }

    /**
     * Soft-delete the tenant account (owner self-service).
     */
    public function deleteCompany(Request $request)
    {
        $user = auth()->user();

        if (! $user->isOwner()) {
            abort(403, 'Hanya owner yang dapat menghapus akun perusahaan.');
        }

        $tenant = Tenant::find($user->tenant_id);

        if (! $tenant) {
            abort(404, 'Tenant tidak ditemukan.');
        }

        $tenant->delete();

        auth()->logout();

        return redirect('/')
            ->with('success', 'Akun perusahaan telah dihapus. Terima kasih telah menggunakan POGrid.');
    }

    public function checkoutDuitku(Request $request, DuitkuService $duitkuService)
    {
        $user = auth()->user();
        TenantManager::setTenantId($user->tenant_id);

        $invoice = TenantManager::runWithoutScope(
            fn () => SubscriptionInvoice::with('plan')
                ->where('tenant_id', $user->tenant_id)
                ->where('status', SubscriptionInvoice::STATUS_UNPAID)
                ->latest('id')
                ->first()
        );

        if (! $invoice) {
            $tenant = Tenant::with('plan')->find($user->tenant_id);
            $plan = $tenant?->plan ?? Plan::first();

            if (! $plan) {
                return redirect()->back()->with('error', 'Paket langganan tidak ditemukan.');
            }

            $priceCents = (int) ($plan->price ?? 50000000);

            $invoice = SubscriptionInvoice::create([
                'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
                'tenant_id' => $user->tenant_id,
                'plan_id' => $plan->id,
                'amount_cents' => $priceCents,
                'status' => SubscriptionInvoice::STATUS_UNPAID,
                'period_start' => now(),
                'period_end' => now()->addDays(30),
                'due_date' => now()->addDays(7),
            ]);
        }

        $result = $duitkuService->createInvoice($invoice, $user);

        if ($result['success'] && ! empty($result['paymentUrl'])) {
            return redirect()->away($result['paymentUrl']);
        }

        return redirect()->back()->with('error', $result['message'] ?? 'Gagal memproses pembayaran dengan Duitku.');
    }
}
