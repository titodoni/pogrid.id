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
use Illuminate\Broadcasting\Broadcasters\PusherBroadcaster;
use Illuminate\Broadcasting\BroadcastEvent;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Config;
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
        $this->assertInstanceOf(PrivateChannel::class, $channels[0]);
        $this->assertEquals('private-tenant.'.$this->tenant->id.'.dashboard', $channels[0]->name);

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
        $this->assertCount(2, $channels);
        $channelNames = array_map(fn ($c) => $c->name, $channels);
        $this->assertContains('private-tenant.'.$this->tenant->id.'.dashboard', $channelNames);
        $this->assertContains('private-tenant.'.$this->tenant->id.'.workers', $channelNames);

        $this->assertEquals('production.terminated', $event->broadcastAs());
    }

    public function test_production_terminated_reaches_owner_dashboard_channel()
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-BC-007',
            'client_name' => 'Client G',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Test Item 7',
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $event = new ProductionTerminated($item);

        $channelNames = array_map(fn ($c) => $c->name, $event->broadcastOn());
        $this->assertContains(
            'private-tenant.'.$this->tenant->id.'.dashboard',
            $channelNames,
            'Owner dashboard must receive production.terminated to refresh its item list.'
        );
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

    public function test_mock_broadcaster_production_terminated_receives_correct_payload(): void
    {
        TenantManager::setTenantId($this->tenant->id);

        $item = Item::create([
            'po_id' => Po::create([
                'po_number' => 'PO-E2E-001',
                'client_name' => 'E2E Client',
                'global_deadline' => now()->addDays(10),
                'status' => 'PENDING',
            ])->id,
            'item_name' => 'E2E Production Terminated Item',
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $mock = $this->createMock(PusherBroadcaster::class);

        $mock->expects($this->once())
            ->method('broadcast')
            ->with(
                $this->callback(function ($channels): bool {
                    $this->assertCount(2, $channels);
                    $names = array_map(fn ($c) => $c->name, $channels);
                    $this->assertContains('private-tenant.'.$this->tenant->id.'.dashboard', $names);
                    $this->assertContains('private-tenant.'.$this->tenant->id.'.workers', $names);

                    return true;
                }),
                'production.terminated',
                $this->callback(function ($payload): bool {
                    $this->assertArrayHasKey('item', $payload);
                    $this->assertArrayHasKey('id', $payload['item']);
                    $this->assertArrayHasKey('item_name', $payload['item']);

                    return true;
                })
            );

        Broadcast::extend('mock-pusher', fn () => $mock);
        Config::set('broadcasting.connections.mock-pusher', ['driver' => 'mock-pusher']);
        Config::set('broadcasting.default', 'mock-pusher');

        broadcast(new ProductionTerminated($item));
    }

    public function test_mock_broadcaster_kendala_reported_receives_correct_payload(): void
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-E2E-002',
            'client_name' => 'E2E Client 2',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);
        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'E2E Kendala Item',
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
            'message' => 'E2E alert test',
            'is_resolved' => false,
        ]);

        $mock = $this->createMock(PusherBroadcaster::class);

        $mock->expects($this->once())
            ->method('broadcast')
            ->with(
                $this->callback(function ($channels): bool {
                    $this->assertCount(1, $channels);
                    $this->assertSame('private-tenant.'.$this->tenant->id.'.dashboard', $channels[0]->name);

                    return true;
                }),
                'kendala.reported',
                $this->callback(function ($payload): bool {
                    $this->assertArrayHasKey('alert', $payload);
                    $this->assertArrayHasKey('id', $payload['alert']);
                    $this->assertArrayHasKey('severity', $payload['alert']);
                    $this->assertArrayHasKey('reason_type', $payload['alert']);

                    return true;
                })
            );

        Broadcast::extend('mock-pusher', fn () => $mock);
        Config::set('broadcasting.connections.mock-pusher', ['driver' => 'mock-pusher']);
        Config::set('broadcasting.default', 'mock-pusher');

        broadcast(new KendalaReported($alert));
    }

    public function test_to_others_is_noop_when_socket_null(): void
    {
        TenantManager::setTenantId($this->tenant->id);

        $item = Item::create([
            'po_id' => Po::create([
                'po_number' => 'PO-E2E-003',
                'client_name' => 'E2E Client 3',
                'global_deadline' => now()->addDays(10),
                'status' => 'PENDING',
            ])->id,
            'item_name' => 'E2E Socket Test Item',
            'target_qty' => 3,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $event = new ProductionTerminated($item);
        $this->assertNull($event->socket);

        broadcast($event)->toOthers();
        $this->assertNull(
            $event->socket,
            'PendingBroadcast::toOthers() checks isset($this->event->socket) which returns false for null. '
            .'Call $event->dontBroadcastToCurrentUser() instead for actual socket exclusion.'
        );
    }

    public function test_dont_broadcast_to_current_user_sets_socket(): void
    {
        TenantManager::setTenantId($this->tenant->id);

        $item = Item::create([
            'po_id' => Po::create([
                'po_number' => 'PO-E2E-004',
                'client_name' => 'E2E Client 4',
                'global_deadline' => now()->addDays(10),
                'status' => 'PENDING',
            ])->id,
            'item_name' => 'E2E Socket Set Item',
            'target_qty' => 3,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $request = new Request;
        $request->headers->set('X-Socket-ID', '1234.5678');
        $this->app->instance('request', $request);

        $event = new ProductionTerminated($item);
        $event->dontBroadcastToCurrentUser();

        $this->assertSame(
            '1234.5678',
            $event->socket,
            'dontBroadcastToCurrentUser() reads Broadcast::socket() from X-Socket-ID header.'
        );
    }
}
