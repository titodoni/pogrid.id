<?php

namespace App\Observers;

use App\Models\Item;
use App\Models\ItemProgress;

class ItemObserver
{
    public function creating(Item $item): void
    {
        $stages = $item->required_stages ?? [];
        $stagesLower = array_map('strtolower', $stages);
        $hasMachining = in_array('machining', $stagesLower) || in_array('cnc', $stagesLower);
        $hasFabrication = in_array('fabrication', $stagesLower) || in_array('fabrikasi', $stagesLower);
        $isManufacture = $item->item_type === 'MANUFACTURE';
        $hasProduction = $hasMachining || $hasFabrication;

        if ($isManufacture) {
            $hasMaterial = in_array('material', $stagesLower) || in_array('bahan', $stagesLower);
            $hasDesign = in_array('design', $stagesLower) || in_array('drawing', $stagesLower) || in_array('gambar', $stagesLower) || in_array('draft', $stagesLower);

            if (! $hasMaterial) {
                array_unshift($stages, 'Material');
                array_unshift($stagesLower, 'material');
            }
            if (! $hasDesign) {
                $matIdx = array_search('material', $stagesLower);
                if ($matIdx === false) {
                    array_unshift($stages, 'Design');
                    array_unshift($stagesLower, 'design');
                } else {
                    array_splice($stages, $matIdx + 1, 0, 'Design');
                    array_splice($stagesLower, $matIdx + 1, 0, 'design');
                }
            }
            if ($hasProduction) {
                if (! in_array('qc', $stagesLower)) {
                    $stages[] = 'QC';
                    $stagesLower[] = 'qc';
                }
                if (! in_array('delivery', $stagesLower) && ! in_array('pengiriman', $stagesLower)) {
                    $stages[] = 'Delivery';
                    $stagesLower[] = 'delivery';
                }
            }
        }

        $item->required_stages = $stages;
    }

    public function created(Item $item): void
    {
        if (is_array($item->required_stages)) {
            foreach ($item->required_stages as $stage) {
                $stageLower = strtolower($stage);
                $isMaterial = in_array($stageLower, ['material', 'bahan']);
                $isDesign = in_array($stageLower, ['design', 'drawing', 'gambar', 'draft']);

                $data = [
                    'tenant_id' => $item->tenant_id,
                    'item_id' => $item->id,
                    'stage_name' => $stage,
                    'completed_qty' => 0,
                    'progress_percent' => 0.00,
                    'status' => 'PENDING',
                ];

                if ($isMaterial) {
                    $data['progress_percent'] = 33.00;
                    $data['status'] = 'IN_PROGRESS';
                } elseif ($isDesign) {
                    $data['progress_percent'] = 50.00;
                    $data['status'] = 'IN_PROGRESS';
                }

                ItemProgress::create($data);
            }
        }
    }
}
