<?php

namespace App\Observers;

use App\Models\Item;
use App\Models\ItemProgress;

class ItemObserver
{
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
    }
}
