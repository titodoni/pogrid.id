<?php

namespace App\Console\Commands;

use App\Models\Item;
use App\Models\ItemProgress;
use App\Services\TenantManager;
use Illuminate\Console\Command;

class BackfillItemStages extends Command
{
    protected $signature = 'pogrid:backfill-stages';

    protected $description = 'Backfill missing Material and Design stages for existing MANUFACTURE items';

    public function handle(): void
    {
        TenantManager::bypass();

        $items = Item::where('item_type', 'MANUFACTURE')->get();
        $count = 0;

        foreach ($items as $item) {
            $stages = $item->required_stages ?? [];
            $stagesLower = array_map('strtolower', $stages);
            $changed = false;
            $existingNames = $item->itemProgresses->pluck('stage_name')->map(fn ($n) => strtolower($n))->toArray();

            $hasMaterial = in_array('material', $stagesLower) || in_array('bahan', $stagesLower);
            $hasDesign = in_array('design', $stagesLower) || in_array('drawing', $stagesLower) || in_array('gambar', $stagesLower) || in_array('draft', $stagesLower);

            if (! $hasMaterial) {
                array_unshift($stages, 'Material');
                array_unshift($stagesLower, 'material');
                $changed = true;
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
                $changed = true;
            }

            if ($changed) {
                $item->required_stages = $stages;
                $item->save();

                if (! in_array('material', $existingNames) && ! in_array('bahan', $existingNames)) {
                    ItemProgress::create([
                        'tenant_id' => $item->tenant_id,
                        'item_id' => $item->id,
                        'stage_name' => 'Material',
                        'completed_qty' => 0,
                        'progress_percent' => 33.00,
                        'status' => 'IN_PROGRESS',
                    ]);
                }

                if (! in_array('design', $existingNames) && ! in_array('drawing', $existingNames) && ! in_array('gambar', $existingNames) && ! in_array('draft', $existingNames)) {
                    ItemProgress::create([
                        'tenant_id' => $item->tenant_id,
                        'item_id' => $item->id,
                        'stage_name' => 'Design',
                        'completed_qty' => 0,
                        'progress_percent' => 50.00,
                        'status' => 'IN_PROGRESS',
                    ]);
                }

                $count++;
                $this->line("Backfilled item {$item->id}: {$item->item_name}");
            }
        }

        TenantManager::enableScope();
        $this->info("Backfilled {$count} items.");
    }
}
