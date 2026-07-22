<?php

namespace App\Events;

use App\Models\Alert;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QcReworkLogged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Alert $alert;

    public function __construct(Alert $alert)
    {
        $this->alert = $alert;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tenant.'.$this->alert->tenant_id.'.dashboard'),
            new PrivateChannel('tenant.'.$this->alert->tenant_id.'.workers'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'qc.rework.logged';
    }
}
