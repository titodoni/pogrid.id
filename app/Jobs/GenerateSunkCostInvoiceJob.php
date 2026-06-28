<?php

namespace App\Jobs;

use App\Models\Item;
use App\Models\Invoice;
use App\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateSunkCostInvoiceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $itemId;
    protected int $completedQty;

    public function __construct(int $itemId, int $completedQty)
    {
        $this->itemId = $itemId;
        $this->completedQty = $completedQty;
    }

    public function handle(): void
    {
        // Temporarily bypass to find item
        TenantManager::bypass();
        $item = Item::find($this->itemId);
        if (!$item) {
            return;
        }

        TenantManager::setTenantId($item->tenant_id);

        $invoiceNumber = 'SC-' . strtoupper(uniqid());
        // Simple heuristic: completed quantity * 150,000 IDR base cost
        $totalAmount = max(150000.00, $this->completedQty * 150000.00);

        Invoice::create([
            'tenant_id' => $item->tenant_id,
            'delivery_order_id' => null,
            'invoice_number' => $invoiceNumber,
            'total_amount' => $totalAmount,
            'status' => 'UNPAID',
            'due_date' => Carbon::today()->addDays(7),
            'invoice_type' => 'SUNK_COST',
        ]);
    }
}
