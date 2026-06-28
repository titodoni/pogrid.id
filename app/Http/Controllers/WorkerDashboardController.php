<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Alert;
use App\Events\KendalaReported;
use App\Services\TenantManager;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WorkerDashboardController extends Controller
{
    public function index($slug)
    {
        // Active items that are not completed or cancelled
        $items = Item::with(['itemProgresses', 'po'])
            ->whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
            ->get();

        return Inertia::render('Worker/Dashboard', [
            'items' => $items,
        ]);
    }

    public function updateProgress(Request $request, $slug, $progressId)
    {
        $request->validate([
            'completed_qty' => ['nullable', 'integer', 'min:0'],
            'progress_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);
        $item = $progress->item;

        if ($item->target_qty > 1) {
            $completedQty = $request->input('completed_qty', 0);
            // Cap completed quantity at target
            $completedQty = min($item->target_qty, $completedQty);
            $progressPercent = ($completedQty / $item->target_qty) * 100;
            $status = $completedQty >= $item->target_qty ? 'COMPLETED' : 'IN_PROGRESS';

            $progress->update([
                'completed_qty' => $completedQty,
                'progress_percent' => $progressPercent,
                'status' => $status,
            ]);
        } else {
            $progressPercent = $request->input('progress_percent', 0.00);
            $status = $progressPercent >= 100.00 ? 'COMPLETED' : 'IN_PROGRESS';

            $progress->update([
                'progress_percent' => $progressPercent,
                'status' => $status,
            ]);
        }

        return back()->with('success', 'Progress updated.');
    }

    public function reportKendala(Request $request, $slug, $progressId)
    {
        $request->validate([
            'kendala_type' => ['required', 'string'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);
        $progress->update(['status' => 'STUCK']);

        $item = $progress->item;
        $po = $item->po;

        // Save RED alert
        $alert = Alert::create([
            'tenant_id' => TenantManager::getTenantId(),
            'item_id' => $item->id,
            'severity' => 'RED',
            'message' => "Stuck: {$request->kendala_type} on stage '{$progress->stage_name}' for item '{$item->item_name}' (PO: {$po->po_number}).",
            'is_resolved' => false,
        ]);

        // Broadcast alert
        broadcast(new KendalaReported($alert))->toOthers();

        return back()->with('success', 'Kendala reported successfully.');
    }

    public function logQcRework(Request $request, $slug, $progressId)
    {
        $request->validate([
            'reject_qty' => ['required', 'integer', 'min:1'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);
        $item = $progress->item;
        $po = $item->po;

        // Spawn a rework stage: stage_name - REWORK
        $reworkStageName = $progress->stage_name . ' - REWORK';

        $reworkProgress = ItemProgress::firstOrCreate([
            'tenant_id' => TenantManager::getTenantId(),
            'item_id' => $item->id,
            'stage_name' => $reworkStageName,
        ], [
            'completed_qty' => 0,
            'progress_percent' => 0.00,
            'status' => 'PENDING',
        ]);

        // Update item status if it was completed or pending, back to in progress
        if ($item->status === 'COMPLETED') {
            $item->update(['status' => 'IN_PROGRESS']);
        }

        // Create a YELLOW alert
        Alert::create([
            'tenant_id' => TenantManager::getTenantId(),
            'item_id' => $item->id,
            'severity' => 'YELLOW',
            'message' => "QC Rework: {$request->reject_qty} items rejected on stage '{$progress->stage_name}' for item '{$item->item_name}' (PO: {$po->po_number}).",
            'is_resolved' => false,
        ]);

        return back()->with('success', 'QC Rework logged and Rework stage spawned.');
    }
}
