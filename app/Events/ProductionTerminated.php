<?php

namespace App\Events;

use App\Models\Item;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProductionTerminated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Item $item;

    public function __construct(Item $item)
    {
        $this->item = $item;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tenant.'.$this->item->tenant_id.'.dashboard'),
            new PrivateChannel('tenant.'.$this->item->tenant_id.'.workers'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'production.terminated';
    }
}
