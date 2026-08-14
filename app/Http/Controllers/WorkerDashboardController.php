<?php

namespace App\Http\Controllers;

use App\Events\KendalaReported;
use App\Events\QcReworkLogged;
use App\Events\TaskUpdated;
use App\Models\Alert;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Post;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\DrafterRoutingService;
use App\Services\ExportService;
use App\Services\ProgressService;
use App\Services\StageGate;
use App\Services\TelemetryService;
use App\Services\TenantManager;
use App\Services\WorkerReportingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class WorkerDashboardController extends Controller
{
    public function index(Request $request, $slug, TelemetryService $telemetryService, WorkerReportingService $workerReporting)
    {
        // 1. Resolve tenant context by slug
        $tenant = $this->resolveTenant($slug);

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
        Gate::authorize('view-tenant', $tenant->id);

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
            $telemetry = $telemetryService->forRange($range);

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

        // Otherwise, render floor operators dashboard
        $data = $workerReporting->dashboard($slug, $user, $tenant);

        return Inertia::render('Worker/Dashboard', [
            'items' => $data['items'],
            'auth_user' => $data['auth_user'],
            'tenant_id' => $tenant->id,
            'tenant' => $data['tenant'],
        ]);
    }

    public function archive(Request $request, $slug, WorkerReportingService $workerReporting)
    {
        $tenant = $this->resolveTenant($slug);

        if (! auth()->check()) {
            return redirect()->route('worker.dashboard', ['slug' => $slug]);
        }

        $user = auth()->user()->load('roleRelation', 'postRelation');
        Gate::authorize('view-tenant', $tenant->id);

        return Inertia::render('Worker/Archive', $workerReporting->archive($user, $tenant));
    }

    public function myKpi(Request $request, $slug, WorkerReportingService $workerReporting)
    {
        $tenant = $this->resolveTenant($slug);

        if (! auth()->check()) {
            return redirect()->route('worker.dashboard', ['slug' => $slug]);
        }

        $user = auth()->user()->load('roleRelation', 'postRelation');
        Gate::authorize('view-tenant', $tenant->id);

        return Inertia::render('Worker/MyKpi', $workerReporting->myKpi($user, $tenant));
    }

    public function exportPdf(Request $request, $slug, ExportService $exportService, TelemetryService $telemetryService)
    {
        [$tenant] = $this->resolveTenantAuth($request, $slug);

        $range = $request->input('range', 'month');
        if (! in_array($range, ['week', 'month', 'year'])) {
            $range = 'month';
        }
        $telemetry = $telemetryService->forRange($range);

        return $exportService->exportPdf($tenant, $telemetry, $range);
    }

    public function exportCsv(Request $request, $slug, ExportService $exportService, TelemetryService $telemetryService)
    {
        [$tenant] = $this->resolveTenantAuth($request, $slug);

        $range = $request->input('range', 'month');
        if (! in_array($range, ['week', 'month', 'year'])) {
            $range = 'month';
        }
        $telemetry = $telemetryService->forRange($range);

        return $exportService->exportCsv($telemetry, $range);
    }

    public function exportXlsx(Request $request, $slug, ExportService $exportService, TelemetryService $telemetryService)
    {
        [$tenant] = $this->resolveTenantAuth($request, $slug);

        $range = $request->input('range', 'month');
        if (! in_array($range, ['week', 'month', 'year'])) {
            $range = 'month';
        }
        $telemetry = $telemetryService->forRange($range);

        return $exportService->exportXlsx($telemetry, $range);
    }

    /**
     * Single tenant-resolution path: explicit scoped lookup by slug, then
     * context set. Never infer tenant context elsewhere.
     */
    private function resolveTenant(string $slug): Tenant
    {
        $tenant = TenantManager::runWithoutScope(fn () => Tenant::where('slug', $slug)->first());
        if (! $tenant) {
            abort(404, 'Tenant not found.');
        }
        TenantManager::setTenantId($tenant->id);

        return $tenant;
    }

    private function resolveTenantAuth(Request $request, $slug): array
    {
        $tenant = $this->resolveTenant($slug);

        if (! auth()->check()) {
            abort(401);
        }

        $user = auth()->user();
        Gate::authorize('view-tenant', $tenant->id);

        $user->load('roleRelation');
        Gate::authorize('access-office');

        return [$tenant];
    }

    public function updateProgress(Request $request, $slug, $progressId, ProgressService $progressService)
    {
        $request->validate([
            'completed_qty' => ['nullable', 'integer', 'min:0'],
            'progress_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);
        StageGate::assertCanUpdate($progress, auth()->user());

        // One atomic business operation: see ProgressService.
        $item = $progressService->applyUpdate($progress, $request->only(['completed_qty', 'progress_percent']));

        $stageLowerForEvent = strtolower($progress->stage_name);
        $isCustomStageForEvent = StageGate::isPreProductionStage($stageLowerForEvent);

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

    public function cancelLastUpdate(Request $request, $slug, $progressId, ProgressService $progressService)
    {
        $progress = ItemProgress::findOrFail($progressId);
        StageGate::assertCanUpdate($progress, auth()->user());

        if ($progress->previous_completed_qty === null && $progress->previous_progress_percent === null) {
            return back()->with('error', 'No previous progress update to cancel.');
        }

        // Atomic revert of the last delta: see ProgressService.
        $item = $progressService->revertLast($progress);

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
        Gate::authorize('view-tenant', $progress->item ? $progress->item->tenant_id : TenantManager::getTenantId());

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

    public function listTroubles(Request $request, $slug, WorkerReportingService $workerReporting)
    {
        $tenant = $this->resolveTenant($slug);

        if (! auth()->check()) {
            return redirect()->route('worker.dashboard', ['slug' => $slug]);
        }

        $user = auth()->user();
        Gate::authorize('view-tenant', $tenant->id);

        return Inertia::render('Worker/TroubleReports', $workerReporting->troubleReports($user, $tenant));
    }

    public function resolveAlert(Request $request, $slug, $alertId)
    {
        $tenant = $this->resolveTenant($slug);

        $user = auth()->user()->loadMissing('roleRelation', 'postRelation');
        Gate::authorize('view-tenant', $tenant->id);

        Gate::authorize('resolve-trouble');

        $alert = Alert::where('tenant_id', $tenant->id)->findOrFail($alertId);
        $alert->update([
            'is_resolved' => true,
        ]);

        return back()->with('success', 'Trouble report resolved successfully.');
    }

    public function logQcRework(Request $request, $slug, $progressId)
    {
        $user = auth()->user()->load('roleRelation');
        Gate::authorize('log-rework');

        $request->validate([
            'reject_qty' => ['required', 'integer', 'min:1'],
            'rework_reason' => ['required', 'string', 'min:3'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);
        $item = $progress->item;
        $po = $item->po;

        // One business operation: spawn rework stage + deduct rejected qty +
        // revert item status + raise alert. Atomic — partial completion would
        // corrupt stage quantities.
        $alert = DB::transaction(function () use ($request, $progress, $item, $po, $user) {
            // Spawn a rework stage: stage_name - REWORK
            $reworkStageName = $progress->stage_name.' - REWORK';

            ItemProgress::firstOrCreate([
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

            // Update item status if it was completed or pending, back to in production
            if ($item->status === 'COMPLETED') {
                $item->update(['status' => 'IN_PRODUCTION']);
            }

            // Create a YELLOW alert with structured reason_type and the custom input reason
            return Alert::create([
                'tenant_id' => TenantManager::getTenantId(),
                'item_id' => $item->id,
                'user_id' => $user->id,
                'severity' => 'YELLOW',
                'reason_type' => 'QC Rework',
                'message' => "QC Rework: {$request->reject_qty} items rejected on stage '{$progress->stage_name}' for item '{$item->item_name}' (PO: {$po->po_number}).",
                'rework_reason' => $request->rework_reason,
                'is_resolved' => false,
            ]);
        });

        broadcast(new QcReworkLogged($alert))->toOthers();

        return back()->with('success', 'QC Rework logged and Rework stage spawned.');
    }

    public function updateDrafterStatus(Request $request, $slug, $itemId, DrafterRoutingService $routingService)
    {
        $request->validate([
            'drafter_status' => ['required', 'string', 'in:DRAWING,APPROVED'],
            'required_stages' => ['nullable', 'array'],
            'required_stages.*' => ['required', 'string'],
        ]);

        Gate::authorize('update-drafter');

        $item = Item::findOrFail($itemId);

        $routingService->updateStatusAndRouting(
            $item,
            $request->drafter_status,
            $request->input('required_stages'),
            auth()->user()
        );

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

        Gate::authorize('update-purchasing');

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
        Gate::authorize('update-finance');

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
            Gate::authorize('update-finance-status-lock', clone $item);
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

        // Item finance update + PO closing cascade form one business operation.
        DB::transaction(function () use ($item, $invoiceStatus, $request, $invoicedQty) {
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
        });

        broadcast(new TaskUpdated($item->tenant_id, "Finance status updated (Invoice: {$invoiceStatus}, Payment: {$request->payment_status}) for item '{$item->item_name}' (PO: {$item->po->po_number})."))->toOthers();

        return back()->with('success', 'Finance status updated.');
    }

    public function financeLedger(Request $request, $slug, WorkerReportingService $workerReporting)
    {
        $tenant = $this->resolveTenant($slug);

        $user = auth()->user()->loadMissing('roleRelation', 'postRelation');
        Gate::authorize('view-tenant', $tenant->id);
        Gate::authorize('view-ledger');

        return Inertia::render('Worker/FinanceLedger', $workerReporting->financeLedger($user, $tenant));
    }

    /**
     * Pre-production stage check against the authoritative keyword list
     * (config/workflow.php — same list the ItemProgressObserver uses).
     */
}
