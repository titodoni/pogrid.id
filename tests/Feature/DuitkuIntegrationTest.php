<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DuitkuIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.duitku.merchant_code', 'DS_TEST');
        config()->set('services.duitku.api_key', 'TEST_API_KEY_12345');
        config()->set('services.duitku.sandbox_mode', true);
        $this->seed();
    }

    public function test_demo_office_login_works(): void
    {
        $response = $this->post('/login', [
            'username' => 'sari',
            'password' => 'poiuy',
        ]);

        $response->assertRedirect('/c/teknik-mandiri');
        $this->assertAuthenticated();
    }

    public function test_demo_floor_pin_login_works(): void
    {
        $tenant = Tenant::where('slug', 'teknik-mandiri')->first();
        $worker = User::where('name', 'Hendra Gunawan')->first();

        $response = $this->post("/c/{$tenant->slug}/login", [
            'user_id' => $worker->id,
            'pin' => '0000',
        ]);

        $response->assertRedirect("/c/{$tenant->slug}");
        $this->assertAuthenticated();
    }

    public function test_landing_page_renders_support_contact_info(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);
    }

    public function test_duitku_checkout_initiates_successfully(): void
    {
        $user = User::where('username', 'sari')->first();
        TenantManager::setTenantId($user->tenant_id);

        $plan = Plan::first() ?? Plan::create([
            'name' => 'Pro Plan',
            'slug' => 'pro-plan',
            'price_cents' => 50000000,
            'billing_interval' => 'monthly',
            'max_users' => 10,
            'max_active_pos' => 50,
        ]);

        // Create an unpaid invoice
        $invoice = SubscriptionInvoice::create([
            'invoice_number' => 'INV-202608-0001',
            'tenant_id' => $user->tenant_id,
            'plan_id' => $plan->id,
            'amount_cents' => 50000000,
            'status' => SubscriptionInvoice::STATUS_UNPAID,
            'period_start' => now(),
            'period_end' => now()->addDays(30),
            'due_date' => now()->addDays(7),
        ]);

        Http::fake([
            'https://api-sandbox.duitku.com/*' => Http::response([
                'statusCode' => '00',
                'statusMessage' => 'SUCCESS',
                'paymentUrl' => 'https://sandbox.duitku.com/payment/invoice?order=INV-202608-0001',
                'reference' => 'DTEST12345',
            ], 200),
        ]);

        $response = $this->actingAs($user)->post('/billing/duitku-checkout');

        $response->assertRedirect('https://sandbox.duitku.com/payment/invoice?order=INV-202608-0001');
    }

    public function test_duitku_callback_webhook_marks_invoice_as_paid(): void
    {
        $tenant = Tenant::where('slug', 'teknik-mandiri')->first();
        $plan = Plan::first() ?? Plan::create([
            'name' => 'Pro Plan',
            'slug' => 'pro-plan',
            'price_cents' => 50000000,
            'billing_interval' => 'monthly',
            'max_users' => 10,
            'max_active_pos' => 50,
        ]);

        $invoice = SubscriptionInvoice::create([
            'invoice_number' => 'INV-202608-9999',
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'amount_cents' => 50000000,
            'status' => SubscriptionInvoice::STATUS_UNPAID,
            'period_start' => now(),
            'period_end' => now()->addDays(30),
            'due_date' => now()->addDays(7),
        ]);

        $merchantCode = config('services.duitku.merchant_code');
        $apiKey = config('services.duitku.api_key');
        $amount = 500000;
        $merchantOrderId = 'INV-202608-9999';
        $signature = md5($merchantCode.$amount.$merchantOrderId.$apiKey);

        $response = $this->postJson('/duitku/callback', [
            'merchantCode' => $merchantCode,
            'amount' => $amount,
            'merchantOrderId' => $merchantOrderId,
            'signature' => $signature,
            'resultCode' => '00',
            'reference' => 'REF9999',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['status' => 'success']);

        $invoice->refresh();
        $this->assertEquals(SubscriptionInvoice::STATUS_PAID, $invoice->status);
        $this->assertNotNull($invoice->paid_at);
        $this->assertStringContainsString('REF9999', $invoice->notes);
    }
}
