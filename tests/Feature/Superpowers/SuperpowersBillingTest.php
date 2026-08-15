<?php

namespace Tests\Feature\Superpowers;

use App\Models\PaymentMethod;
use App\Models\Plan;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\SubscriptionActivatedNotification;
use App\Notifications\SubscriptionInvoiceNotification;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class SuperpowersBillingTest extends SuperpowersTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsPlatformAdmin();
    }

    public function test_payment_methods_can_be_created_updated_and_deleted(): void
    {
        // 1. Create bank transfer
        $this->post('/superpowers/subscriptions/payment-methods', [
            'name' => 'BCA Virtual Account',
            'type' => 'bank_transfer',
            'provider' => 'bca',
            'account_number' => '1122334455',
            'account_holder' => 'PT POgrid Teknologi Indonesia',
            'instructions' => 'Bayar via BCA Mobile ke rekening VA di atas.',
            'is_active' => true,
            'sort_order' => 1,
        ])->assertRedirect();

        $pm = PaymentMethod::where('account_number', '1122334455')->first();
        $this->assertNotNull($pm);
        $this->assertSame('BCA Virtual Account', $pm->name);
        $this->assertSame('bca', $pm->provider);

        // 2. Create Mayar.id Gateway config with encrypted credentials
        $this->post('/superpowers/subscriptions/payment-methods', [
            'name' => 'Mayar.id QRIS & VA Gateway',
            'type' => 'payment_gateway',
            'provider' => 'mayar',
            'config' => [
                'api_key' => 'mayar_live_secret_token_123',
                'webhook_token' => 'mayar_webhook_token_xyz',
                'is_production' => false,
            ],
            'is_active' => false, // Pending KYC
            'sort_order' => 2,
        ])->assertRedirect();

        $gateway = PaymentMethod::where('provider', 'mayar')->first();
        $this->assertNotNull($gateway);
        $this->assertSame('mayar_live_secret_token_123', $gateway->config['api_key']);
        $this->assertSame('mayar_webhook_token_xyz', $gateway->config['webhook_token']);
        $this->assertFalse($gateway->is_active);

        // 3. Update payment method
        $this->put("/superpowers/subscriptions/payment-methods/{$pm->id}", [
            'name' => 'BCA Corporate Transfer',
            'type' => 'bank_transfer',
            'provider' => 'bca',
            'account_number' => '9988776655',
            'account_holder' => 'PT POgrid Teknologi',
            'is_active' => true,
            'sort_order' => 5,
        ])->assertRedirect();

        $this->assertSame('9988776655', $pm->fresh()->account_number);

        // 4. Delete payment method
        $this->delete("/superpowers/subscriptions/payment-methods/{$pm->id}")->assertRedirect();
        $this->assertNull(PaymentMethod::find($pm->id));
    }

    public function test_subscription_invoices_can_be_created_and_filtered(): void
    {
        Notification::fake();

        $plan = Plan::create(['name' => 'Annual Subscription', 'price' => 5_000_000_00]);
        $tenant = $this->makeTenant(['plan_id' => $plan->id]);

        $owner = TenantManager::runWithoutScope(fn () => User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Owner Sari',
            'email' => 'sari@alpha.test',
            'password' => Hash::make('poiuy'),
            'role_id' => 8,
            'post_id' => 12,
            'is_owner' => true,
        ]));

        // Create 1-Year Invoice with automated period calculation
        $this->post('/superpowers/subscriptions/invoices', [
            'tenant_id' => $tenant->id,
            'amount_cents' => 5_000_000_00,
            'notes' => 'Tagihan Tahunan 1 Tahun POgrid',
            'send_email' => true,
        ])->assertRedirect();

        $invoice = SubscriptionInvoice::where('tenant_id', $tenant->id)->first();
        $this->assertNotNull($invoice);
        $this->assertSame(SubscriptionInvoice::STATUS_UNPAID, $invoice->status);
        $this->assertSame(5_000_000_00, $invoice->amount_cents);
        $this->assertNotNull($invoice->period_start);
        $this->assertNotNull($invoice->period_end);

        Notification::assertSentTo($owner, SubscriptionInvoiceNotification::class);

        // Test manual resend email action
        $this->post("/superpowers/subscriptions/invoices/{$invoice->id}/send-email")->assertRedirect();
        Notification::assertSentTo($owner, SubscriptionInvoiceNotification::class);

        // Verify index list renders
        $this->get('/superpowers/subscriptions/invoices')->assertInertia(fn ($page) => $page
            ->component('Superpowers/Subscriptions/Invoices')
            ->has('invoices.data', 1)
            ->where('totals.unpaid_count', 1)
        );
    }

    public function test_direct_tenant_1_year_extension(): void
    {
        Notification::fake();

        $tenant = $this->makeTenant(['subscription_status' => Tenant::STATUS_READONLY]);

        $owner = TenantManager::runWithoutScope(fn () => User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Owner Budi',
            'email' => 'budi@bengkel.test',
            'password' => Hash::make('poiuy'),
            'role_id' => 8,
            'post_id' => 12,
            'is_owner' => true,
        ]));

        $this->post("/superpowers/tenants/{$tenant->id}/direct-extend")->assertRedirect();

        $fresh = TenantManager::runWithoutScope(fn () => $tenant->fresh());
        $this->assertSame(Tenant::STATUS_ACTIVE, $fresh->subscription_status);
        $this->assertTrue($fresh->hasActiveSubscription());
        $this->assertNotNull($fresh->subscription_expires_at);

        Notification::assertSentTo($owner, SubscriptionActivatedNotification::class);
    }

    public function test_1_click_invoice_approval_activates_tenant_and_sets_expiration(): void
    {
        $plan = Plan::create(['name' => 'Pro Monthly', 'price' => 500_000_00]);
        $tenant = $this->makeTenant([
            'plan_id' => $plan->id,
            'subscription_status' => Tenant::STATUS_READONLY,
        ]);

        $invoice = SubscriptionInvoice::create([
            'invoice_number' => 'INV-TEST-001',
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'amount_cents' => 500_000_00,
            'status' => SubscriptionInvoice::STATUS_PENDING_VERIFICATION,
            'due_date' => now()->addDays(3),
            'period_start' => now(),
            'period_end' => now()->addDays(30),
        ]);

        $this->post("/superpowers/subscriptions/invoices/{$invoice->id}/approve")->assertRedirect();

        $freshInvoice = $invoice->fresh();
        $this->assertSame(SubscriptionInvoice::STATUS_PAID, $freshInvoice->status);
        $this->assertNotNull($freshInvoice->paid_at);
        $this->assertNotNull($freshInvoice->approved_by_platform_admin_id);

        $freshTenant = TenantManager::runWithoutScope(fn () => $tenant->fresh());
        $this->assertSame(Tenant::STATUS_ACTIVE, $freshTenant->subscription_status);
        $this->assertTrue($freshTenant->hasActiveSubscription());
        $this->assertNotNull($freshTenant->subscription_expires_at);

        $this->assertDatabaseHas('platform_activity_logs', [
            'action' => 'invoice.approved_and_activated',
            'target_id' => $invoice->id,
        ]);
    }

    public function test_tenant_owner_can_view_billing_and_upload_payment_proof(): void
    {
        Storage::fake('public');

        $tenant = $this->makeTenant(['slug' => 'pabrik-maju']);
        $owner = TenantManager::runWithoutScope(fn () => User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Pak Budi',
            'email' => 'budi@maju.test',
            'email_verified_at' => now(),
            'password' => Hash::make('secret123'),
            'role_id' => 8,
            'post_id' => 12,
            'is_owner' => true,
        ]));

        $bca = PaymentMethod::create([
            'name' => 'BCA Rekening Resmi',
            'type' => 'bank_transfer',
            'provider' => 'bca',
            'account_number' => '888777666',
            'account_holder' => 'PT POgrid Teknologi',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        // Login as tenant owner
        $this->actingAs($owner);

        // View billing page
        $this->get('/billing')->assertInertia(fn ($page) => $page
            ->component('Owner/Billing')
            ->has('payment_methods', 3) // 2 seeded defaults + 1 BCA created above
        );

        // Upload payment proof
        $file = UploadedFile::fake()->create('bukti_transfer.jpg', 200, 'image/jpeg');

        $this->post('/billing/upload-proof', [
            'payment_method_id' => $bca->id,
            'proof' => $file,
        ])->assertRedirect();

        $invoice = SubscriptionInvoice::where('tenant_id', $tenant->id)->first();
        $this->assertNotNull($invoice);
        $this->assertSame(SubscriptionInvoice::STATUS_PENDING_VERIFICATION, $invoice->status);
        $this->assertNotNull($invoice->payment_proof_path);

        Storage::disk('public')->assertExists($invoice->payment_proof_path);
    }
}
