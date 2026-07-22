<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $tenantId;
    public string $message;

    public function __construct(int $tenantId, string $message)
    {
        $this->tenantId = $tenantId;
        $this->message = $message;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tenant.'.$this->tenantId.'.dashboard'),
            new PrivateChannel('tenant.'.$this->tenantId.'.workers'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'task.updated';
    }
}
