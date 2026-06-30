<?php

namespace App\Observers;

use App\Models\Item;
use App\Models\ItemProgress;

class ItemObserver
{
    public function creating(Item $item): void
    {
        if ($item->item_type === 'MANUFACTURE') {
            $stages = $item->required_stages ?? [];
            if (in_array('Machining', $stages) || in_array('Fabrication', $stages)) {
                if (!in_array('QC', $stages)) {
                    $stages[] = 'QC';
                }
                if (!in_array('Delivery', $stages)) {
                    $stages[] = 'Delivery';
                }
                $item->required_stages = $stages;
            }
        }
    }

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
