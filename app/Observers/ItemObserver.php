<?php

namespace App\Observers;

use App\Models\Item;
use App\Models\ItemProgress;
use App\Services\ActivityLogger;

class ItemObserver
{
    /** @var array<int,string> transient prior status keyed by item id */
    protected static array $priorStatus = [];

    public function creating(Item $item): void
    {
        // No auto-injection — admin's exact stage selection is preserved.
        // ItemProgress rows are created in the created() hook from whatever
        // required_stages the admin selected.
    }

    public function created(Item $item): void
    {
        if (is_array($item->required_stages)) {
            foreach ($item->required_stages as $stage) {
                $data = [
                    'tenant_id' => $item->tenant_id,
                    'item_id' => $item->id,
                    'stage_name' => $stage,
                    'completed_qty' => 0,
                    'progress_percent' => 0.00,
                    'status' => 'PENDING',
                ];

                ItemProgress::create($data);
            }
        }

        ActivityLogger::logItemCreated($item);
    }

    public function updating(Item $item): void
    {
        // Capture prior status before it is overwritten by the save.
        self::$priorStatus[$item->id] = (string) $item->getOriginal('status');
    }

    public function updated(Item $item): void
    {
        // Audit any explicit item status transition (cancelled / terminated / completed).
        $prior = self::$priorStatus[$item->id] ?? null;
        unset(self::$priorStatus[$item->id]);
        if ($prior !== null && $prior !== $item->status) {
            ActivityLogger::logItemStatus($item, $prior, (string) $item->status);
        }
    }
}
