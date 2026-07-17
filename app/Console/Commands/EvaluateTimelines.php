<?php

namespace App\Console\Commands;

use App\Events\AlertEscalated;
use App\Events\TimelineAlertCreated;
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
        TenantManager::bypass();

        $tenants = Tenant::all();

        foreach ($tenants as $tenant) {
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

                if ($now->greaterThan($deadline)) {
                    $alert = Alert::updateOrCreate(
                        [
                            'tenant_id' => $tenant->id,
                            'item_id' => $item->id,
                            'severity' => 'RED',
                            'message' => "Overdue: Item '{$item->item_name}' under {$po->po_number} is not completed past deadline.",
                        ],
                        ['is_resolved' => false]
                    );
                    if ($alert->wasRecentlyCreated) {
                        broadcast(new TimelineAlertCreated($alert))->toOthers();
                    }
                } elseif ($daysRemaining <= 3 && (float) $item->progress_percent < 70.00) {
                    $alert = Alert::updateOrCreate(
                        [
                            'tenant_id' => $tenant->id,
                            'item_id' => $item->id,
                            'severity' => 'YELLOW',
                            'message' => "Approaching Risk: Item '{$item->item_name}' under {$po->po_number} has {$daysRemaining} days remaining and is under 70% progress.",
                        ],
                        ['is_resolved' => false]
                    );
                    if ($alert->wasRecentlyCreated) {
                        broadcast(new TimelineAlertCreated($alert))->toOthers();
                    }
                } else {
                    Alert::where('item_id', $item->id)
                        ->where('is_resolved', false)
                        ->where(function ($query) {
                            $query->where('message', 'like', 'Overdue:%')
                                ->orWhere('message', 'like', 'Approaching Risk:%');
                        })
                        ->update(['is_resolved' => true]);
                }
            }

            // Escalate RED alerts unresolved >24h
            $cutoff = Carbon::now()->subHours(24);
            $staleRedAlerts = Alert::where('tenant_id', $tenant->id)
                ->where('severity', 'RED')
                ->where('is_resolved', false)
                ->whereNull('escalated_at')
                ->where('created_at', '<', $cutoff)
                ->get();

            foreach ($staleRedAlerts as $alert) {
                $alert->update(['escalated_at' => Carbon::now()]);
                broadcast(new AlertEscalated($alert))->toOthers();
            }
        }

        TenantManager::enableScope();
        $this->info('Timelines evaluated successfully.');
    }
}
