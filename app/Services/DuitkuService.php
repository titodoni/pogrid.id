<?php

namespace App\Services;

use App\Models\SubscriptionInvoice;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DuitkuService
{
    protected string $merchantCode;

    protected string $apiKey;

    protected bool $sandboxMode;

    public function __construct()
    {
        $this->merchantCode = (string) config('services.duitku.merchant_code', '');
        $this->apiKey = (string) config('services.duitku.api_key', '');
        $this->sandboxMode = (bool) config('services.duitku.sandbox_mode', true);
    }

    public function getBaseUrl(): string
    {
        return $this->sandboxMode ? 'https://api-sandbox.duitku.com' : 'https://api-prod.duitku.com';
    }

    /**
     * Create an invoice on Duitku Pop
     *
     * @return array{success: bool, paymentUrl?: string, message?: string}
     */
    public function createInvoice(SubscriptionInvoice $invoice, User $user): array
    {
        if (empty($this->merchantCode) || empty($this->apiKey)) {
            return [
                'success' => false,
                'message' => 'Konfigurasi Duitku belum lengkap (Merchant Code / API Key kosong).',
            ];
        }

        $paymentAmount = (int) ($invoice->amount_cents / 100);
        if ($paymentAmount <= 0) {
            $paymentAmount = 500000; // Default Rp 500.000 for standard plan
        }
        $merchantOrderId = $invoice->invoice_number;
        $timestamp = (int) round(microtime(true) * 1000);
        $signature = hash('sha256', $this->merchantCode.$timestamp.$this->apiKey);

        $productDetails = 'Langganan POgrid - '.($invoice->plan?->name ?? 'Paket Standard');

        $nameParts = explode(' ', trim($user->name), 2);
        $firstName = $nameParts[0];
        $lastName = $nameParts[1] ?? $nameParts[0];

        $customerDetail = [
            'firstName' => $firstName,
            'lastName' => $lastName,
            'email' => $user->email,
            'phoneNumber' => $user->phone ?? '08156198101',
        ];

        $itemDetails = [
            [
                'name' => $productDetails,
                'price' => $paymentAmount,
                'quantity' => 1,
            ],
        ];

        $payload = [
            'paymentAmount' => $paymentAmount,
            'merchantOrderId' => $merchantOrderId,
            'productDetails' => $productDetails,
            'customerVaName' => $user->name,
            'email' => $user->email,
            'phoneNumber' => $user->phone ?? '08156198101',
            'itemDetails' => $itemDetails,
            'customerDetail' => $customerDetail,
            'callbackUrl' => route('duitku.callback'),
            'returnUrl' => url('/dashboard/billing'),
            'expiryPeriod' => 1440, // 24 hours in minutes
        ];

        try {
            $response = Http::withHeaders([
                'x-duitku-signature' => $signature,
                'x-duitku-timestamp' => (string) $timestamp,
                'x-duitku-merchantcode' => $this->merchantCode,
                'Content-Type' => 'application/json',
            ])->timeout(15)->post($this->getBaseUrl().'/api/merchant/createInvoice', $payload);

            if ($response->successful()) {
                $result = $response->json();
                if (isset($result['paymentUrl'])) {
                    return [
                        'success' => true,
                        'paymentUrl' => $result['paymentUrl'],
                        'reference' => $result['reference'] ?? null,
                    ];
                }

                return [
                    'success' => false,
                    'message' => $result['statusMessage'] ?? 'Gagal membuat invoice Duitku.',
                ];
            }

            Log::error('Duitku createInvoice HTTP error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'success' => false,
                'message' => 'Terjadi kesalahan saat menghubungi server Duitku ('.$response->status().').',
            ];
        } catch (\Throwable $e) {
            Log::error('Duitku createInvoice exception', ['error' => $e->getMessage()]);

            return [
                'success' => false,
                'message' => 'Exception: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Handle incoming callback notification from Duitku
     *
     * @return array{status: int, response: array}
     */
    public function handleCallback(Request $request): array
    {
        $merchantCode = $request->input('merchantCode');
        $amount = $request->input('amount');
        $merchantOrderId = $request->input('merchantOrderId');
        $signature = $request->input('signature');
        $resultCode = $request->input('resultCode');
        $reference = $request->input('reference');

        if (empty($merchantCode) || empty($amount) || empty($merchantOrderId) || empty($signature)) {
            return [
                'status' => 400,
                'response' => ['status' => 'bad request', 'message' => 'Parameter tidak lengkap'],
            ];
        }

        $calcSignature = md5($this->merchantCode.$amount.$merchantOrderId.$this->apiKey);

        if ($signature !== $calcSignature) {
            Log::warning('Duitku callback signature mismatch', [
                'expected' => $calcSignature,
                'received' => $signature,
            ]);

            return [
                'status' => 400,
                'response' => ['status' => 'bad signature'],
            ];
        }

        if ($resultCode === '00') {
            TenantManager::runWithoutScope(function () use ($merchantOrderId, $reference) {
                $invoice = SubscriptionInvoice::where('invoice_number', $merchantOrderId)->first();
                if ($invoice && $invoice->status !== SubscriptionInvoice::STATUS_PAID) {
                    $invoice->status = SubscriptionInvoice::STATUS_PAID;
                    $invoice->paid_at = now();
                    $invoice->notes = ($invoice->notes ? $invoice->notes."\n" : '')."Lunas via Duitku Pop (Ref: {$reference})";
                    $invoice->save();

                    $tenant = $invoice->tenant;
                    if ($tenant) {
                        $tenant->subscription_status = 'active';
                        $periodDays = $invoice->plan && $invoice->plan->billing_interval === 'yearly' ? 365 : 30;
                        $tenant->subscription_expires_at = now()->addDays($periodDays);
                        $tenant->save();
                    }
                }
            });

            return [
                'status' => 200,
                'response' => ['status' => 'success'],
            ];
        }

        return [
            'status' => 200,
            'response' => ['status' => 'received', 'resultCode' => $resultCode],
        ];
    }
}
