<?php

namespace App\Console\Commands;

use App\Models\Alert;
use App\Models\Item;
use App\Models\Tenant;
use App\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Console\Command;

class EvaluateTimelines extends Command
{
    protected $signature = 'pogrid:evaluate-timelines';

    protected $description = 'Evaluate active items timeline and spawn alerts';

    public function handle(): void
    {
        // Bypass TenantScope to process all tenants
        TenantManager::bypass();

        $tenants = Tenant::all();

        foreach ($tenants as $tenant) {
            // Set context for saving alerts with correct tenant_id
            TenantManager::setTenantId($tenant->id);

            $activeItems = Item::where('tenant_id', $tenant->id)
                ->whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
                ->get();
            $now = Carbon::today();

            foreach ($activeItems as $item) {
                $po = $item->po;
                if (! $po) {
                    continue;
                }

                $deadline = Carbon::parse($po->global_deadline);
                $daysRemaining = $now->diffInDays($deadline, false);

                // Check RED alert (Overdue): Current Date > Global Deadline while progress < 100%
                if ($now->greaterThan($deadline)) {
                    Alert::updateOrCreate(
                        [
                            'tenant_id' => $tenant->id,
                            'item_id' => $item->id,
                            'severity' => 'RED',
                            'message' => "Overdue: Item '{$item->item_name}' under {$po->po_number} is not completed past deadline.",
                        ],
                        ['is_resolved' => false]
                    );
                }
                // Check YELLOW alert (Approaching Risk): Days Remaining <= 3 AND Item Progress < 70%
                elseif ($daysRemaining <= 3 && (float) $item->progress_percent < 70.00) {
                    Alert::updateOrCreate(
                        [
                            'tenant_id' => $tenant->id,
                            'item_id' => $item->id,
                            'severity' => 'YELLOW',
                            'message' => "Approaching Risk: Item '{$item->item_name}' under {$po->po_number} has {$daysRemaining} days remaining and is under 70% progress.",
                        ],
                        ['is_resolved' => false]
                    );
                } else {
                    // Resolve timeline alerts for this item if timeline is healthy
                    Alert::where('item_id', $item->id)
                        ->where('is_resolved', false)
                        ->where(function ($query) {
                            $query->where('message', 'like', 'Overdue:%')
                                ->orWhere('message', 'like', 'Approaching Risk:%');
                        })
                        ->update(['is_resolved' => true]);
                }
            }
        }

        TenantManager::enableScope();
        $this->info('Timelines evaluated successfully.');
    }
}
