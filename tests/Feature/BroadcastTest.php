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
        $this->assertCount(2, $channels);
        $channelNames = array_map(fn ($c) => $c->name, $channels);
        $this->assertContains('private-tenant.'.$this->tenant->id.'.dashboard', $channelNames);
        $this->assertContains('private-tenant.'.$this->tenant->id.'.workers', $channelNames);

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
                    $this->assertCount(2, $channels);
                    $names = array_map(fn ($c) => $c->name, $channels);
                    $this->assertContains('private-tenant.'.$this->tenant->id.'.dashboard', $names);
                    $this->assertContains('private-tenant.'.$this->tenant->id.'.workers', $names);

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

    public function test_presence_channel_authorization_returns_user_data()
    {
        TenantManager::setTenantId($this->tenant->id);

        $user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'John Operator',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('1234'),
        ]);

        $this->actingAs($user);

        $response = $this->post('/broadcasting/auth', [
            'channel_name' => 'presence-tenant.'.$this->tenant->id.'.presence',
            'socket_id' => '1234.5678',
        ]);

        $response->assertStatus(200);
    }

    public function test_presence_channel_authorization_blocks_other_tenant()
    {
        $tenantB = Tenant::create([
            'company_name' => 'Other Workshop',
            'slug' => 'other-workshop',
            'subscription_status' => 'active',
        ]);

        $user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'John Operator',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('1234'),
        ]);

        $this->actingAs($user);

        $response = $this->post('/broadcasting/auth', [
            'channel_name' => 'presence-tenant.'.$tenantB->id.'.presence',
            'socket_id' => '1234.5678',
        ]);

        $response->assertStatus(403);
    }

    public function test_task_updated_broadcast_configuration()
    {
        TenantManager::setTenantId($this->tenant->id);

        $event = new \App\Events\TaskUpdated($this->tenant->id, 'Task updated message');

        $channels = $event->broadcastOn();
        $this->assertCount(2, $channels);
        $channelNames = array_map(fn ($c) => $c->name, $channels);
        $this->assertContains('private-tenant.'.$this->tenant->id.'.dashboard', $channelNames);
        $this->assertContains('private-tenant.'.$this->tenant->id.'.workers', $channelNames);

        $this->assertEquals('task.updated', $event->broadcastAs());
    }

    public function test_data_sync_observer_fires_data_refreshed_on_model_saved()
    {
        TenantManager::setTenantId($this->tenant->id);
        Queue::fake();

        $po = Po::create([
            'po_number' => 'PO-DS-001',
            'client_name' => 'Client Sync',
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'Sync Item',
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'PENDING',
        ]);

        $progress = $item->itemProgresses()->first();
        $progress->completed_qty = 2;
        $progress->save();

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) {
            return $job->event instanceof \App\Events\DataRefreshed;
        });
    }

    public function test_po_creation_triggers_task_updated_broadcast()
    {
        TenantManager::setTenantId($this->tenant->id);
        Queue::fake();

        $adminRole = \App\Models\Role::create([
            'name' => 'ADMIN',
            'level' => 'office',
            'display_name' => 'Admin',
        ]);

        $admin = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Admin User',
            'role_id' => $adminRole->id,
            'username' => 'admin_test',
            'password' => bcrypt('password'),
        ]);

        $this->actingAs($admin);

        $response = $this->post('/pos', [
            'po_number' => 'PO-NEW-999',
            'client_name' => 'Client New',
            'global_deadline_relative' => '1 week',
            'items' => [
                [
                    'item_name' => 'New Item',
                    'item_type' => 'MANUFACTURE',
                    'target_qty' => 10,
                    'required_stages' => ['Machining'],
                ]
            ]
        ]);

        $response->assertRedirect();

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) {
            return $job->event instanceof \App\Events\TaskUpdated;
        });
    }

    public function test_dashboard_channel_auth_allows_owner_and_office_roles_blocks_worker()
    {
        TenantManager::setTenantId($this->tenant->id);

        $officeRole = \App\Models\Role::create([
            'name' => 'STAFF',
            'level' => 'office',
            'display_name' => 'Staff',
        ]);

        $workerRole = \App\Models\Role::create([
            'name' => 'WORKER',
            'level' => 'production',
            'display_name' => 'Worker',
        ]);

        $officeUser = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Office Staff',
            'role_id' => $officeRole->id,
            'username' => 'office_staff',
            'password' => bcrypt('password'),
        ]);

        $workerUser = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Floor Worker',
            'role_id' => $workerRole->id,
            'pin' => bcrypt('1234'),
        ]);

        // 1. Office user can auth on dashboard channel
        $this->actingAs($officeUser);
        $resOffice = $this->post('/broadcasting/auth', [
            'channel_name' => 'private-tenant.'.$this->tenant->id.'.dashboard',
            'socket_id' => '1234.5678',
        ]);
        $resOffice->assertStatus(200);

        // 2. Floor worker is rejected from dashboard channel
        $this->actingAs($workerUser);
        $resWorker = $this->post('/broadcasting/auth', [
            'channel_name' => 'private-tenant.'.$this->tenant->id.'.dashboard',
            'socket_id' => '1234.5678',
        ]);
        $resWorker->assertStatus(403);
    }

    public function test_presence_channel_unauthenticated_user_rejected()
    {
        $response = $this->post('/broadcasting/auth', [
            'channel_name' => 'presence-tenant.'.$this->tenant->id.'.presence',
            'socket_id' => '1234.5678',
        ]);

        $response->assertStatus(403);
    }
}
