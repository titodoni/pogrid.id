<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        \App\Services\TenantManager::enableScope();
        \App\Services\TenantManager::setTenantId(null);
    }
}
