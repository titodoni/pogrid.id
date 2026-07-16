<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('tenant.{tenantId}.dashboard', function () {
    return true;
});

Broadcast::channel('tenant.{tenantId}.workers', function () {
    return true;
});
