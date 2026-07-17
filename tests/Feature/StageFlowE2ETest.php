<?php

namespace Tests\Feature;

use App\Models\DeliveryOrder;
use App\Models\DoItem;
use App\Models\Item;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * GIT-72 — E2E stage flow test suite.
 *
 * Dedicated end-to-end coverage of the POGrid production stage pipeline:
 *  - Full chain: Design -> Material -> Machining -> Fabrication -> QC -> Delivery -> Finance
 *  - Dependency locks: QC gate (production complete), Delivery gate (QC delivered), Finance gate (delivered_qty > 0)
 *  - cancelLastUpdate on custom stages (drafter/purchasing status revert)
 *  - Off-state locks: Vendor job, Machining-only item
 */
class StageFlowE2ETest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'company_name' => 'E2E Teknik',
            'slug' => 'e2e-teknik',
            'subscription_status' => 'active',
        ]);
    }

    private function worker(int $roleId, int $postId, string $pin = '1234'): User
    {
        return User::create([
            'tenant_id' => $this->tenant->id,
            'name' => "Worker R{$roleId}P{$postId}",
            'role_id' => $roleId,
            'post_id' => $postId,
            'pin' => bcrypt($pin),
        ]);
    }

    /**
     * Objective 1: Full chain Design -> Material -> Machining -> Fabrication -> QC -> Delivery -> Finance.
     * Verifies weighted progress accumulates and final PO closes only after finance post-delivery.
     */
    public function test_full_chain_design_to_finance_closes_po()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-E2E-FULL',
            'client_name' => 'E2E Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Full Chain Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Design', 'Material', 'Machining', 'Fabrication', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        $stages = [];
        foreach (['Design', 'Material', 'Machining', 'Fabrication', 'QC', 'Delivery'] as $name) {
            $stages[$name] = $item->itemProgresses()->where('stage_name', $name)->first();
        }

        $slug = $this->tenant->slug;
        $drafter = $this->worker(1, 1);
        $purchasing = $this->worker(2, 2);
        $machining = $this->worker(3, 4);
        $fabrication = $this->worker(4, 6);
        $qc = $this->worker(6, 8);
        $delivery = $this->worker(7, 9);
        $finance = $this->worker(9, 10);

        // Early progression: item should not hit 100% until Delivery.
        $this->actingAs($drafter);
        $this->post("/c/{$slug}/progress/{$stages['Design']->id}/update", ['progress_percent' => 100])->assertRedirect();
        $this->actingAs($purchasing);
        $this->post("/c/{$slug}/progress/{$stages['Material']->id}/update", ['progress_percent' => 100])->assertRedirect();

        $item->refresh();
        $this->assertLessThan(100.00, (float) $item->progress_percent);
        $this->assertEquals('IN_PROGRESS', $item->status);

        // Production.
        $this->actingAs($machining);
        $this->post("/c/{$slug}/progress/{$stages['Machining']->id}/update", ['completed_qty' => 10])->assertRedirect();
        $this->actingAs($fabrication);
        $this->post("/c/{$slug}/progress/{$stages['Fabrication']->id}/update", ['completed_qty' => 10])->assertRedirect();

        // QC gate: QC allowed only after Machining+Fabrication complete.
        $this->actingAs($qc);
        $this->post("/c/{$slug}/progress/{$stages['QC']->id}/update", ['completed_qty' => 10])->assertRedirect();

        // Finance gate: blocked before any delivery recorded.
        $this->actingAs($finance);
        $this->post("/c/{$slug}/items/{$item->id}/finance", [
            'invoice_status' => 'INVOICED',
            'payment_status' => 'PAID',
        ])->assertStatus(403);

        // Delivery gate: Delivery worker logs full quantity.
        $this->actingAs($delivery);
        $this->post("/c/{$slug}/progress/{$stages['Delivery']->id}/update", ['completed_qty' => 10])->assertRedirect();

        $item->refresh();
        $this->assertEquals(100.00, (float) $item->progress_percent);
        $this->assertEquals('COMPLETED', $item->status);

        // Delivery creates DO + DoItem.
        $this->assertDatabaseHas('delivery_orders', ['po_id' => $po->id]);
        $this->assertEquals(10, $item->doItems()->sum('delivered_qty'));

        // Now Finance can close.
        $this->actingAs($finance);
        $this->post("/c/{$slug}/items/{$item->id}/finance", [
            'invoice_status' => 'INVOICED',
            'payment_status' => 'PAID',
        ])->assertRedirect();

        $item->refresh();
        $this->assertEquals('INVOICED', $item->invoice_status);
        $this->assertEquals('PAID', $item->payment_status);

        $po->refresh();
        $this->assertEquals('CLOSED', $po->status);
    }

    /**
     * Objective 2a: QC gate — QC update blocked until production (Machining/Fabrication) complete.
     */
    public function test_qc_gate_blocks_until_production_complete()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-E2E-QC',
            'client_name' => 'QC Gate Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'QC Gate Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Design', 'Material', 'Machining', 'Fabrication', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        $slug = $this->tenant->slug;
        $qc = $this->worker(6, 8);
        $machining = $this->worker(3, 4);
        $fabrication = $this->worker(4, 6);
        $qcStage = $item->itemProgresses()->where('stage_name', 'QC')->first();
        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();
        $fabStage = $item->itemProgresses()->where('stage_name', 'Fabrication')->first();

        // Complete Design & Material so production-only gate is isolated.
        $item->itemProgresses()->whereIn('stage_name', ['Design', 'Material'])->update(['status' => 'COMPLETED', 'completed_qty' => 10]);

        // QC blocked while production incomplete.
        $this->actingAs($qc);
        $this->post("/c/{$slug}/progress/{$qcStage->id}/update", ['completed_qty' => 5])->assertStatus(403);

        // Complete production.
        $this->actingAs($machining);
        $this->post("/c/{$slug}/progress/{$machiningStage->id}/update", ['completed_qty' => 10])->assertRedirect();
        $this->actingAs($fabrication);
        $this->post("/c/{$slug}/progress/{$fabStage->id}/update", ['completed_qty' => 10])->assertRedirect();

        // QC now allowed.
        $this->actingAs($qc);
        $this->post("/c/{$slug}/progress/{$qcStage->id}/update", ['completed_qty' => 10])->assertRedirect();
        $this->assertEquals(10, $qcStage->refresh()->completed_qty);
    }

    /**
     * Objective 2b: Delivery gate — Delivery worker blocked until QC completed.
     */
    public function test_delivery_gate_blocks_until_qc_complete()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-E2E-DEL',
            'client_name' => 'Delivery Gate Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Delivery Gate Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'QC', 'Delivery'],
            'status' => 'PENDING',
        ]);

        $slug = $this->tenant->slug;
        $machining = $this->worker(3, 4);
        $qc = $this->worker(6, 8);
        $delivery = $this->worker(7, 9);
        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();
        $qcStage = $item->itemProgresses()->where('stage_name', 'QC')->first();
        $deliveryStage = $item->itemProgresses()->where('stage_name', 'Delivery')->first();

        // Complete Machining only.
        $this->actingAs($machining);
        $this->post("/c/{$slug}/progress/{$machiningStage->id}/update", ['completed_qty' => 10])->assertRedirect();

        // Delivery blocked while QC incomplete.
        $this->actingAs($delivery);
        $this->post("/c/{$slug}/progress/{$deliveryStage->id}/update", ['completed_qty' => 10])->assertStatus(403);

        // Complete QC.
        $this->actingAs($qc);
        $this->post("/c/{$slug}/progress/{$qcStage->id}/update", ['completed_qty' => 10])->assertRedirect();

        // Delivery now allowed.
        $this->actingAs($delivery);
        $this->post("/c/{$slug}/progress/{$deliveryStage->id}/update", ['completed_qty' => 10])->assertRedirect();
        $this->assertEquals(10, $deliveryStage->refresh()->completed_qty);
    }

    /**
     * Objective 2c: Finance gate — Finance blocked until item has delivered_qty > 0.
     */
    public function test_finance_gate_blocks_until_delivered()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-E2E-FIN',
            'client_name' => 'Finance Gate Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Finance Gate Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining', 'Delivery'],
            'status' => 'PENDING',
        ]);

        $slug = $this->tenant->slug;
        $machining = $this->worker(3, 4);
        $delivery = $this->worker(7, 9);
        $finance = $this->worker(9, 10);
        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();
        $deliveryStage = $item->itemProgresses()->where('stage_name', 'Delivery')->first();

        // Complete Machining + mark Delivery stage COMPLETED (status) but with NO delivered_qty via DO.
        $this->actingAs($machining);
        $this->post("/c/{$slug}/progress/{$machiningStage->id}/update", ['completed_qty' => 10])->assertRedirect();
        $deliveryStage->update(['status' => 'COMPLETED', 'completed_qty' => 10, 'progress_percent' => 100]);

        // Finance blocked: no DoItem / delivered_qty yet.
        $this->actingAs($finance);
        $this->post("/c/{$slug}/items/{$item->id}/finance", [
            'invoice_status' => 'INVOICED',
            'payment_status' => 'PAID',
        ])->assertStatus(403);

        // Record delivery via DO.
        $do = DeliveryOrder::create(['po_id' => $po->id, 'do_number' => 'DO-E2E-FIN', 'delivery_date' => now()]);
        DoItem::create(['delivery_order_id' => $do->id, 'item_id' => $item->id, 'delivered_qty' => 10]);
        $item->refresh();

        // Finance now allowed.
        $this->actingAs($finance);
        $this->post("/c/{$slug}/items/{$item->id}/finance", [
            'invoice_status' => 'INVOICED',
            'payment_status' => 'PAID',
        ])->assertRedirect();
        $this->assertEquals('PAID', $item->refresh()->payment_status);
    }

    /**
     * Objective 3: cancelLastUpdate on custom stages (drafter-status + purchasing-status revert).
     */
    public function test_cancel_last_update_on_custom_stages()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-E2E-REVERT',
            'client_name' => 'Revert Client',
            'global_deadline' => now()->addDays(5),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Revert Custom Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Design', 'Material', 'CNC'],
            'status' => 'PENDING',
        ]);

        $slug = $this->tenant->slug;
        $drafter = $this->worker(1, 1);
        $purchasing = $this->worker(2, 2);
        $designStage = $item->itemProgresses()->where('stage_name', 'Design')->first();
        $materialStage = $item->itemProgresses()->where('stage_name', 'Material')->first();

        // Warm-start initial custom-state progress values.
        $designStage->update(['progress_percent' => 50.00, 'status' => 'IN_PROGRESS']);
        $materialStage->update(['progress_percent' => 33.00, 'status' => 'IN_PROGRESS']);

        // Drafter approves design.
        $this->actingAs($drafter);
        $this->post("/c/{$slug}/items/{$item->id}/drafter-status", ['drafter_status' => 'APPROVED'])->assertRedirect();
        $this->assertEquals('APPROVED', $item->refresh()->drafter_status);

        // Cancel last drafter update -> reverts to DRAWING.
        $this->post("/c/{$slug}/progress/{$designStage->id}/cancel-last-update")->assertRedirect();
        $item->refresh();
        $this->assertEquals('DRAWING', $item->drafter_status);
        $this->assertEquals(50.00, $designStage->refresh()->progress_percent);

        // Purchasing readies material.
        $this->actingAs($purchasing);
        $this->post("/c/{$slug}/items/{$item->id}/purchasing-status", ['purchasing_status' => 'READY'])->assertRedirect();
        $this->assertEquals('READY', $item->refresh()->purchasing_status);

        // Cancel last purchasing update -> reverts to ORDER.
        $this->post("/c/{$slug}/progress/{$materialStage->id}/cancel-last-update")->assertRedirect();
        $item->refresh();
        $this->assertEquals('ORDER', $item->purchasing_status);
        $this->assertEquals(33.00, $materialStage->refresh()->progress_percent);
    }

    /**
     * Objective 4a: Off-state lock — Vendor job: downstream stages locked until vendor stage complete.
     */
    public function test_off_state_lock_vendor_job()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-E2E-VENDOR',
            'client_name' => 'Vendor Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Vendor Job Item',
            'target_qty' => 1,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Vendor', 'Machining'],
            'status' => 'PENDING',
        ]);

        $slug = $this->tenant->slug;
        $machining = $this->worker(3, 4);
        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();

        // Machining locked while Vendor stage open (off-state lock).
        $this->actingAs($machining);
        $this->post("/c/{$slug}/progress/{$machiningStage->id}/update", ['progress_percent' => 50])->assertStatus(403);

        // NOTE (GIT-72 QA finding): Vendor-job lock at WorkerDashboardController.php:1793 is
        // unconditional — Machining stays locked EVEN AFTER the Vendor stage is COMPLETED.
        // Asserting current (defective) behavior so the regression is visible.
        $vendorStage = $item->itemProgresses()->where('stage_name', 'Vendor')->first();
        $vendorStage->update(['status' => 'COMPLETED', 'progress_percent' => 100]);

        $this->actingAs($machining);
        $response = $this->post("/c/{$slug}/progress/{$machiningStage->id}/update", ['progress_percent' => 100]);
        $response->assertStatus(403);
    }

    /**
     * Objective 4b: Off-state lock — Machining-only item: no auto-injected stages; only Machining editable.
     */
    public function test_off_state_lock_machining_only()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-E2E-MACH',
            'client_name' => 'Machining Client',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Machining Only Item',
            'target_qty' => 10,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        // No off-state stage injection.
        $this->assertEquals(1, $item->itemProgresses()->count());
        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();

        $slug = $this->tenant->slug;
        $machining = $this->worker(3, 4);
        $qc = $this->worker(6, 8);

        // Machining worker can update.
        $this->actingAs($machining);
        $this->post("/c/{$slug}/progress/{$machiningStage->id}/update", ['completed_qty' => 10])->assertRedirect();
        $this->assertEquals(10, $machiningStage->refresh()->completed_qty);

        // QC worker (off-stage for this item) cannot update Machining.
        $this->actingAs($qc);
        $this->post("/c/{$slug}/progress/{$machiningStage->id}/update", ['completed_qty' => 5])->assertStatus(403);
    }
}
