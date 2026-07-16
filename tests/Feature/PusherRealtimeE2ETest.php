<?php

namespace Tests\Feature;

use App\Events\KendalaReported;
use App\Events\ProductionTerminated;
use App\Models\Item;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Broadcasting\BroadcastEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * End-to-end coverage for the Pusher real-time features (GIT-41).
 *
 * These tests prove the full server-to-client path that the browser tabs rely on:
 *  - Worker reports a kendala  -> KendalaReported on the owner dashboard channel
 *  - Owner terminates an item  -> ProductionTerminated on owner dashboard + worker channels
 *  - Broadcasts are tenant-scoped (no cross-tenant leakage across sessions/tabs)
 *  - The sender's own connection is excluded via toOthers() when X-Socket-ID is sent
 *  - Both dashboards receive the Pusher config prop so the frontend Echo subscribes
 *
 * Broadcasting jobs are captured via Queue::fake() (the test driver is `null`, so the
 * real Pusher broadcaster is never touched) and the dispatched event is inspected.
 */
class PusherRealtimeE2ETest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'company_name' => 'Realtime Workshop',
            'slug' => 'realtime-workshop',
            'subscription_status' => 'active',
        ]);
    }

    private function makePoAndItem(string $suffix = ''): array
    {
        TenantManager::setTenantId($this->tenant->id);

        $po = Po::create([
            'po_number' => 'PO-RT-'.$suffix,
            'client_name' => 'RT Client '.$suffix,
            'global_deadline' => now()->addDays(10),
            'status' => 'PENDING',
        ]);

        $item = Item::create([
            'po_id' => $po->id,
            'item_name' => 'RT Item '.$suffix,
            'target_qty' => 5,
            'item_type' => 'MANUFACTURE',
            'required_stages' => ['Machining'],
            'status' => 'IN_PROGRESS',
        ]);

        return [$po, $item];
    }

    private function makeWorker(): User
    {
        return User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'RT Machining Worker',
            'role_id' => 3,
            'post_id' => 4,
            'pin' => bcrypt('1234'),
        ]);
    }

    private function makeOwner(): User
    {
        return User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'RT Owner',
            'role_id' => 8,
            'post_id' => 12,
            'email' => 'rt-owner@example.com',
            'password' => bcrypt('password'),
            'is_owner' => true,
        ]);
    }

    /**
     * Criterion: Kendala reported triggers toast on Owner dashboard in other tabs.
     */
    public function test_report_kendala_broadcasts_kendala_reported_to_owner_dashboard(): void
    {
        TenantManager::setTenantId($this->tenant->id);
        Queue::fake();

        [$po, $item] = $this->makePoAndItem('K');
        $stage = $item->itemProgresses()->where('stage_name', 'Machining')->first();
        $this->actingAs($this->makeWorker());

        $this->post("/c/{$this->tenant->slug}/progress/{$stage->id}/kendala", [
            'kendala_type' => 'Machine Broken',
            'note' => 'Spindle jammed',
        ])->assertRedirect();

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) use ($item) {
            $event = $job->event;
            $this->assertInstanceOf(KendalaReported::class, $event);

            $channelNames = array_map(fn ($c) => $c->name, $event->broadcastOn());
            $this->assertSame(
                ['private-tenant.'.$this->tenant->id.'.dashboard'],
                $channelNames,
                'Kendala must broadcast only on the owner dashboard channel (toast target).'
            );
            $this->assertSame('kendala.reported', $event->broadcastAs());

            $alert = $event->alert;
            $this->assertSame($item->id, $alert->item_id);
            $this->assertSame('RED', $alert->severity);
            $this->assertSame('Machine Broken', $alert->reason_type);
            $this->assertStringContainsString('Spindle jammed', $alert->message);

            return true;
        });
    }

    /**
     * Criterion: Production terminated triggers item list update on Owner dashboard
     * AND freeze alert on Worker dashboard.
     */
    public function test_terminate_item_broadcasts_production_terminated_to_owner_and_worker_channels(): void
    {
        TenantManager::setTenantId($this->tenant->id);
        Queue::fake();

        [$po, $item] = $this->makePoAndItem('T');
        $item->itemProgresses()->update(['completed_qty' => 2, 'status' => 'IN_PROGRESS']);
        $this->actingAs($this->makeOwner());

        $this->post("/items/{$item->id}/terminate")->assertRedirect();

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) use ($item) {
            $event = $job->event;
            $this->assertInstanceOf(ProductionTerminated::class, $event);

            $channelNames = array_map(fn ($c) => $c->name, $event->broadcastOn());
            $this->assertContains('private-tenant.'.$this->tenant->id.'.dashboard', $channelNames, 'Owner dashboard must reload its list.');
            $this->assertContains('private-tenant.'.$this->tenant->id.'.workers', $channelNames, 'Worker dashboard must show the freeze alert.');
            $this->assertSame('production.terminated', $event->broadcastAs());

            $this->assertSame($item->id, $event->item->id);
            $this->assertSame('TERMINATED', $event->item->status);
            $this->assertSame('RT Item T', $event->item->item_name);

            return true;
        });
    }

    /**
     * Side-effect of termination: a sunk-cost invoice is generated for Finance.
     */
    public function test_terminate_item_creates_sunk_cost_invoice(): void
    {
        TenantManager::setTenantId($this->tenant->id);

        [$po, $item] = $this->makePoAndItem('INV');
        $item->itemProgresses()->update(['completed_qty' => 2, 'status' => 'IN_PROGRESS']);
        $this->actingAs($this->makeOwner());

        $this->post("/items/{$item->id}/terminate")->assertRedirect();

        $this->assertDatabaseHas('invoices', [
            'tenant_id' => $this->tenant->id,
            'invoice_type' => 'SUNK_COST',
        ]);
        $this->assertDatabaseHas('items', [
            'id' => $item->id,
            'status' => 'TERMINATED',
        ]);
    }

    /**
     * Criterion: Works across browser tabs and sessions -> tenant isolation.
     * A kendala from tenant A must NOT appear on tenant B's dashboard channel.
     */
    public function test_kendala_broadcast_isolated_per_tenant(): void
    {
        $tenantB = Tenant::create([
            'company_name' => 'Other Workshop',
            'slug' => 'other-workshop',
            'subscription_status' => 'active',
        ]);

        TenantManager::setTenantId($this->tenant->id);
        Queue::fake();

        [$po, $item] = $this->makePoAndItem('A');
        $stage = $item->itemProgresses()->where('stage_name', 'Machining')->first();
        $this->actingAs($this->makeWorker());

        $this->post("/c/{$this->tenant->slug}/progress/{$stage->id}/kendala", [
            'kendala_type' => 'Machine Broken',
        ])->assertRedirect();

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) use ($tenantB) {
            $event = $job->event;
            $this->assertInstanceOf(KendalaReported::class, $event);

            $channelNames = array_map(fn ($c) => $c->name, $event->broadcastOn());
            $this->assertContains('private-tenant.'.$this->tenant->id.'.dashboard', $channelNames);
            $this->assertNotContains('private-tenant.'.$tenantB->id.'.dashboard', $channelNames, 'Kendala must not leak to another tenant.');

            return true;
        });
    }

    /**
     * Criterion: Works across browser tabs and sessions -> tenant isolation.
     * A terminate from tenant A must NOT reach tenant B's worker channel.
     */
    public function test_terminate_broadcast_isolated_per_tenant(): void
    {
        $tenantB = Tenant::create([
            'company_name' => 'Other Workshop B',
            'slug' => 'other-workshop-b',
            'subscription_status' => 'active',
        ]);

        TenantManager::setTenantId($this->tenant->id);
        Queue::fake();

        [$po, $item] = $this->makePoAndItem('B');
        $this->actingAs($this->makeOwner());

        $this->post("/items/{$item->id}/terminate")->assertRedirect();

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) use ($tenantB) {
            $event = $job->event;
            $this->assertInstanceOf(ProductionTerminated::class, $event);

            $channelNames = array_map(fn ($c) => $c->name, $event->broadcastOn());
            $this->assertNotContains('tenant.'.$tenantB->id.'.dashboard', $channelNames);
            $this->assertNotContains('tenant.'.$tenantB->id.'.workers', $channelNames, 'Terminate must not leak to another tenant.');

            return true;
        });
    }

    /**
     * Criterion: Sender does not receive their own broadcast (toOthers).
     *
     * toOthers() only excludes the sender when the triggering request carries the
     * Pusher X-Socket-ID header (set by the frontend fetch wrapper). This test proves
     * the server honors that header: with it present the event carries the socket id
     * (so Pusher excludes the sender's tab), and without it the event has no socket
     * (the no-op case the frontend fix addresses).
     */
    public function test_sender_socket_excluded_via_to_others_when_socket_id_sent(): void
    {
        TenantManager::setTenantId($this->tenant->id);
        Queue::fake();

        [$po, $item] = $this->makePoAndItem('S');
        $this->actingAs($this->makeOwner());

        $this->withHeader('X-Socket-ID', '9999.8888')
            ->post("/items/{$item->id}/terminate")
            ->assertRedirect();

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) {
            $event = $job->event;
            $this->assertInstanceOf(ProductionTerminated::class, $event);
            $this->assertSame(
                '9999.8888',
                $event->socket,
                'toOthers() must capture the sender socket id from X-Socket-ID so Pusher excludes the sender tab.'
            );

            return true;
        });
    }

    public function test_sender_socket_is_null_without_socket_id_header(): void
    {
        TenantManager::setTenantId($this->tenant->id);
        Queue::fake();

        [$po, $item] = $this->makePoAndItem('N');
        $this->actingAs($this->makeOwner());

        $this->post("/items/{$item->id}/terminate")->assertRedirect();

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) {
            $event = $job->event;
            $this->assertInstanceOf(ProductionTerminated::class, $event);
            $this->assertNull(
                $event->socket,
                'Without X-Socket-ID the sender would receive its own broadcast (caught by frontend fetch wrapper).'
            );

            return true;
        });
    }

    /**
     * Linkage: the Owner dashboard (office view at /c/{slug}) receives the Pusher
     * config prop so the frontend Echo instance initializes and subscribes to the
     * dashboard channel (kendala toast + terminate reload).
     */
    public function test_owner_dashboard_receives_pusher_config_prop(): void
    {
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($this->makeOwner())
            ->get("/c/{$this->tenant->slug}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('pusher')
                ->where('pusher.key', fn ($key) => ! is_null($key))
                ->where('pusher.cluster', fn ($cluster) => ! is_null($cluster)));
    }

    /**
     * Linkage: the Worker dashboard receives the Pusher config prop so the frontend
     * Echo instance initializes and subscribes to the worker channel (freeze alert).
     */
    public function test_worker_dashboard_receives_pusher_config_prop(): void
    {
        TenantManager::setTenantId($this->tenant->id);

        $this->actingAs($this->makeWorker())
            ->get("/c/{$this->tenant->slug}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('pusher')
                ->where('pusher.key', fn ($key) => ! is_null($key))
                ->where('pusher.cluster', fn ($cluster) => ! is_null($cluster)));
    }
}
