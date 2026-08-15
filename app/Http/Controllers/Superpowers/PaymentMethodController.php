<?php

namespace App\Http\Controllers\Superpowers;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\PlatformActivityLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PaymentMethodController extends Controller
{
    public function index()
    {
        $paymentMethods = PaymentMethod::orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($pm) => [
                'id' => $pm->id,
                'name' => $pm->name,
                'type' => $pm->type,
                'provider' => $pm->provider,
                'account_number' => $pm->account_number,
                'account_holder' => $pm->account_holder,
                'instructions' => $pm->instructions,
                'config' => $pm->config ? [
                    'api_key' => $pm->config['api_key'] ? '••••••••' : '',
                    'webhook_token' => $pm->config['webhook_token'] ? '••••••••' : '',
                    'merchant_id' => $pm->config['merchant_id'] ?? '',
                    'client_key' => $pm->config['client_key'] ?? '',
                    'server_key' => $pm->config['server_key'] ? '••••••••' : '',
                    'is_production' => (bool) ($pm->config['is_production'] ?? false),
                ] : null,
                'is_active' => $pm->is_active,
                'sort_order' => $pm->sort_order,
                'created_at' => $pm->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Superpowers/Subscriptions/PaymentMethods', [
            'payment_methods' => $paymentMethods,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', Rule::in(PaymentMethod::TYPES)],
            'provider' => ['required', 'string', Rule::in(PaymentMethod::PROVIDERS)],
            'account_number' => ['nullable', 'string', 'max:100'],
            'account_holder' => ['nullable', 'string', 'max:255'],
            'instructions' => ['nullable', 'string'],
            'config' => ['nullable', 'array'],
            'config.api_key' => ['nullable', 'string'],
            'config.webhook_token' => ['nullable', 'string'],
            'config.merchant_id' => ['nullable', 'string'],
            'config.client_key' => ['nullable', 'string'],
            'config.server_key' => ['nullable', 'string'],
            'config.is_production' => ['nullable', 'boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer'],
        ]);

        $pm = PaymentMethod::create([
            'name' => $data['name'],
            'type' => $data['type'],
            'provider' => $data['provider'],
            'account_number' => $data['account_number'] ?? null,
            'account_holder' => $data['account_holder'] ?? null,
            'instructions' => $data['instructions'] ?? null,
            'config' => ! empty($data['config']) ? $data['config'] : null,
            'is_active' => $data['is_active'] ?? true,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'payment_method.created',
            'target_type' => PaymentMethod::class,
            'target_id' => $pm->id,
            'metadata' => [
                'name' => $pm->name,
                'type' => $pm->type,
                'provider' => $pm->provider,
            ],
        ]);

        return redirect()->back()->with('success', 'Metode pembayaran berhasil ditambahkan.');
    }

    public function update(Request $request, PaymentMethod $paymentMethod)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', Rule::in(PaymentMethod::TYPES)],
            'provider' => ['required', 'string', Rule::in(PaymentMethod::PROVIDERS)],
            'account_number' => ['nullable', 'string', 'max:100'],
            'account_holder' => ['nullable', 'string', 'max:255'],
            'instructions' => ['nullable', 'string'],
            'config' => ['nullable', 'array'],
            'config.api_key' => ['nullable', 'string'],
            'config.webhook_token' => ['nullable', 'string'],
            'config.merchant_id' => ['nullable', 'string'],
            'config.client_key' => ['nullable', 'string'],
            'config.server_key' => ['nullable', 'string'],
            'config.is_production' => ['nullable', 'boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer'],
        ]);

        $config = $paymentMethod->config ?? [];
        if (! empty($data['config'])) {
            // Keep existing keys if omitted or masked
            if (empty($data['config']['server_key']) || $data['config']['server_key'] === '••••••••') {
                $data['config']['server_key'] = $config['server_key'] ?? null;
            }
            if (empty($data['config']['api_key']) || $data['config']['api_key'] === '••••••••') {
                $data['config']['api_key'] = $config['api_key'] ?? null;
            }
            if (empty($data['config']['webhook_token']) || $data['config']['webhook_token'] === '••••••••') {
                $data['config']['webhook_token'] = $config['webhook_token'] ?? null;
            }
            $config = $data['config'];
        }

        $paymentMethod->update([
            'name' => $data['name'],
            'type' => $data['type'],
            'provider' => $data['provider'],
            'account_number' => $data['account_number'] ?? null,
            'account_holder' => $data['account_holder'] ?? null,
            'instructions' => $data['instructions'] ?? null,
            'config' => ! empty($config) ? $config : null,
            'is_active' => $data['is_active'] ?? true,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'payment_method.updated',
            'target_type' => PaymentMethod::class,
            'target_id' => $paymentMethod->id,
            'metadata' => [
                'name' => $paymentMethod->name,
            ],
        ]);

        return redirect()->back()->with('success', 'Metode pembayaran berhasil diperbarui.');
    }

    public function destroy(Request $request, PaymentMethod $paymentMethod)
    {
        $name = $paymentMethod->name;
        $paymentMethod->delete();

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'payment_method.deleted',
            'target_type' => PaymentMethod::class,
            'target_id' => $paymentMethod->id,
            'metadata' => ['name' => $name],
        ]);

        return redirect()->back()->with('success', 'Metode pembayaran berhasil dihapus.');
    }
}
