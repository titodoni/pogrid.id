<?php

namespace Tests\Feature;

use App\Events\KendalaReported;
use App\Events\ProductionTerminated;
use App\Models\Alert;
use App\Models\Item;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\BroadcastEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class BroadcastTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'company_name' => 'Test Workshop',
            'slug' => 'test-workshop',
            'subscription_status' => 'active',
        ]);
    }

    public function test_kendala_reported_broadcast_configuration()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-BC-001',
            'client_name' => 'Client A',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Test Item',
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $alert = Alert::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $item->id,
            'severity' => 'RED',
            'reason_type' => 'Machine Broken',
            'message' => 'Test alert',
            'is_resolved' => false,
        ]);

        $event = new KendalaReported($alert);

        $channels = $event->broadcastOn();
        $this->assertCount(1, $channels);
        $this->assertInstanceOf(Channel::class, $channels[0]);
        $this->assertEquals('tenant.'.$this->tenant->id.'.dashboard', $channels[0]->name);

        $this->assertEquals('kendala.reported', $event->broadcastAs());
    }

    public function test_production_terminated_broadcast_configuration()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-BC-002',
            'client_name' => 'Client B',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Test Item 2',
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $event = new ProductionTerminated($item);

        $channels = $event->broadcastOn();
        $this->assertCount(1, $channels);
        $this->assertInstanceOf(Channel::class, $channels[0]);
        $this->assertEquals('tenant.'.$this->tenant->id.'.workers', $channels[0]->name);

        $this->assertEquals('production.terminated', $event->broadcastAs());
    }

    public function test_kendala_reported_triggers_broadcast_job()
    {
        TenantManager::setTenantId($this->tenant->id);
        Queue::fake();

        $po = Po::create([
            'po_number' => 'PO-BC-003',
            'client_name' => 'Client C',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Test Item 3',
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $alert = Alert::create([
            'tenant_id' => $this->tenant->id,
            'item_id' => $item->id,
            'severity' => 'RED',
            'reason_type' => 'Machine Broken',
            'message' => 'Broadcast job test',
            'is_resolved' => false,
        ]);

        broadcast(new KendalaReported($alert));

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) {
            return $job->event instanceof KendalaReported;
        });
    }

    public function test_production_terminated_triggers_broadcast_job()
    {
        TenantManager::setTenantId($this->tenant->id);
        Queue::fake();

        $po = Po::create([
            'po_number' => 'PO-BC-004',
            'client_name' => 'Client D',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Test Item 4',
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        broadcast(new ProductionTerminated($item));

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) {
            return $job->event instanceof ProductionTerminated;
        });
    }

    public function test_controller_report_kendala_triggers_broadcast_job()
    {
        TenantManager::setTenantId($this->tenant->id);
        Queue::fake();

        $po = Po::create([
            'po_number' => 'PO-BC-005',
            'client_name' => 'Client E',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Test Item 5',
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $machiningStage = $item->itemProgresses()->where('stage_name', 'Machining')->first();

        $worker = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Machining Worker',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('1234'),
        ]);
        $this->actingAs($worker);

        $this->post("/c/{$this->tenant->slug}/progress/{$machiningStage->id}/kendala", [
            'kendala_type' => 'Machine Broken',
        ]);

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) {
            return $job->event instanceof KendalaReported;
        });
    }

    public function test_controller_terminate_midway_triggers_broadcast_job()
    {
        TenantManager::setTenantId($this->tenant->id);
        Queue::fake();

        $po = Po::create([
            'po_number' => 'PO-BC-006',
            'client_name' => 'Client F',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Test Item 6',
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $item->itemProgresses()->update(['completed_qty' => 2, 'status' => 'IN_PROGRESS']);

        $user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Staff',
            'role_id' => 8,
            'post_id' => 12,
            'email' => 'staff@example.com',
            'password' => bcrypt('password'),
        ]);
        $this->actingAs($user);

        $this->post("/items/{$item->id}/terminate");

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) {
            return $job->event instanceof ProductionTerminated;
        });
    }
}
