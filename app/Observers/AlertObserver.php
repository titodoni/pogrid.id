<?php

namespace App\Observers;

use App\Models\Alert;
use App\Services\ActivityLogger;

class AlertObserver
{
    public function created(Alert $alert): void
    {
        ActivityLogger::logAlert($alert);
    }
}
