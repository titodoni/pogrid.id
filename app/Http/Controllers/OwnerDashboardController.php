<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Po;
use App\Models\Alert;
use App\Models\DeliveryOrder;
use App\Models\DoItem;
use App\Models\Invoice;
use App\Services\TenantManager;
use App\Jobs\GenerateSunkCostInvoiceJob;
use App\Events\ProductionTerminated;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Barryvdh\DomPDF\Facade\Pdf;

class OwnerDashboardController extends Controller
{
    public function index()
    {
        $pos = Po::with('items.itemProgresses')->get();
        $alerts = Alert::where('is_resolved', false)->get();
        
        // Load Delivery Orders and Invoices for the dashboard
        $deliveryOrders = DeliveryOrder::with(['po', 'doItems.item'])->get();
        $invoices = Invoice::with(['deliveryOrder.po'])->get();
        
        return Inertia::render('Owner/Dashboard', [
            'pos' => $pos,
            'alerts' => $alerts,
            'deliveryOrders' => $deliveryOrders,
            'invoices' => $invoices,
        ]);
    }

    public function cancelItem(Request $request, $itemId)
    {
        $item = Item::findOrFail($itemId);

        // Business guard: IF Item Progress > 0% -> Returns HTTP 403 Forbidden
        if ((float)$item->progress_percent > 0.00) {
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
        $completedPieces = $stagesCount > 0 ? (int)round($totalCompleted / $stagesCount) : 0;

        // Dispatch mandatory billing job to Finance
        GenerateSunkCostInvoiceJob::dispatch($item->id, $completedPieces);

        return back()->with('success', 'Production halted. Sunk-cost recovery billing task dispatched.');
    }

    public function createDeliveryOrder(Request $request)
    {
        $request->validate([
            'po_id' => ['required', 'exists:pos,id'],
            'do_number' => [
                'required',
                'string',
                Rule::unique('delivery_orders')->where('tenant_id', TenantManager::getTenantId()),
            ],
            'delivery_date' => ['required', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'exists:items,id'],
            'items.*.delivered_qty' => ['required', 'integer', 'min:1'],
        ]);

        $po = Po::findOrFail($request->po_id);
        
        $itemsData = $request->input('items', []);
        foreach ($itemsData as $entry) {
            $item = Item::findOrFail($entry['item_id']);
            if ($item->po_id !== $po->id) {
                return back()->withErrors(['items' => "Item '{$item->item_name}' does not belong to PO {$po->po_number}."]);
            }
            
            $deliveredQty = (int)$entry['delivered_qty'];
            $previouslyDelivered = (int)$item->doItems()->sum('delivered_qty');
            $remainingQty = $item->target_qty - $previouslyDelivered;
            
            if ($deliveredQty > $remainingQty) {
                return back()->withErrors(['items' => "Delivered quantity for '{$item->item_name}' ({$deliveredQty}) exceeds remaining quantity ({$remainingQty})."]);
            }
        }

        DB::transaction(function () use ($request, $po, $itemsData) {
            $do = DeliveryOrder::create([
                'tenant_id' => TenantManager::getTenantId(),
                'po_id' => $po->id,
                'do_number' => $request->do_number,
                'delivery_date' => $request->delivery_date,
            ]);

            foreach ($itemsData as $entry) {
                DoItem::create([
                    'delivery_order_id' => $do->id,
                    'item_id' => $entry['item_id'],
                    'delivered_qty' => $entry['delivered_qty'],
                ]);
            }
        });

        return back()->with('success', 'Delivery Order created successfully.');
    }

    public function createInvoice(Request $request)
    {
        // Business guard: Invoice generation is completely blocked unless at least one DO exists
        if (DeliveryOrder::count() === 0) {
            abort(403, 'Invoice generation is completely blocked unless at least one DO exists.');
        }

        $request->validate([
            'delivery_order_id' => ['required', 'exists:delivery_orders,id'],
            'invoice_number' => [
                'required',
                'string',
                Rule::unique('invoices')->where('tenant_id', TenantManager::getTenantId()),
            ],
            'due_date' => ['required', 'date'],
        ]);

        $do = DeliveryOrder::findOrFail($request->delivery_order_id);

        // Calculate total amount based on DO items: delivered_qty * 150000 IDR per unit
        $totalAmount = 0.00;
        foreach ($do->doItems as $doItem) {
            $totalAmount += $doItem->delivered_qty * 150000.00;
        }

        Invoice::create([
            'tenant_id' => TenantManager::getTenantId(),
            'delivery_order_id' => $do->id,
            'invoice_number' => $request->invoice_number,
            'total_amount' => max(150000.00, $totalAmount), // Minimum 150k
            'status' => 'UNPAID',
            'due_date' => $request->due_date,
            'invoice_type' => 'STANDARD',
        ]);

        return back()->with('success', 'Invoice generated successfully.');
    }

    public function downloadInvoicePdf($invoiceId)
    {
        $invoice = Invoice::with(['deliveryOrder.po', 'deliveryOrder.doItems.item'])->findOrFail($invoiceId);

        $pdf = Pdf::loadView('pdf.invoice', compact('invoice'));
        return $pdf->download('invoice-' . $invoice->invoice_number . '.pdf');
    }
}
