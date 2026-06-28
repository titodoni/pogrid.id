<?php

namespace App\Observers;

use App\Models\Item;
use App\Models\ItemProgress;

class ItemObserver
{
    public function created(Item $item): void
    {
        if (is_array($item->required_stages)) {
            foreach ($item->required_stages as $stage) {
                ItemProgress::create([
                    'tenant_id' => $item->tenant_id,
                    'item_id' => $item->id,
                    'stage_name' => $stage,
                    'completed_qty' => 0,
                    'progress_percent' => 0.00,
                    'status' => 'PENDING',
                ]);
            }
        }
    }
}
