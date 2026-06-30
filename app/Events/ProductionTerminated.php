<?php

namespace App\Events;

use App\Models\Item;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProductionTerminated implements ShouldBroadcast
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
            new Channel('tenant.'.$this->item->tenant_id.'.workers'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'production.terminated';
    }
}
