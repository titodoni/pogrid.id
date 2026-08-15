<?php

namespace App\Http\Controllers\Superpowers;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\PlatformActivityLog;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\SubscriptionActivatedNotification;
use App\Notifications\SubscriptionInvoiceNotification;
use App\Services\TenantManager;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class SubscriptionInvoiceController extends Controller
{
    public function index(Request $request)
    {
        $statusFilter = $request->string('status')->toString();
        $search = $request->string('search')->trim()->toString();

        $invoices = TenantManager::runWithoutScope(function () use ($statusFilter, $search) {
            $query = SubscriptionInvoice::with([
                'tenant' => fn ($q) => $q->withTrashed(),
                'plan:id,name,price',
                'paymentMethod:id,name,type,provider',
                'approvedByPlatformAdmin:id,name',
            ]);

            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('invoice_number', 'like', "%{$search}%")
                        ->orWhereHas('tenant', fn ($tq) => $tq->where('company_name', 'like', "%{$search}%")->orWhere('slug', 'like', "%{$search}%"));
                });
            }

            if ($statusFilter !== '' && $statusFilter !== 'all') {
                $query->where('status', strtoupper($statusFilter));
            }

            return $query->orderByDesc('id')
                ->paginate(25)
                ->through(fn ($inv) => [
                    'id' => $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'tenant' => $inv->tenant ? [
                        'id' => $inv->tenant->id,
                        'company_name' => $inv->tenant->company_name,
                        'slug' => $inv->tenant->slug,
                        'subscription_expires_at' => $inv->tenant->subscription_expires_at?->toDateString(),
                    ] : null,
                    'plan' => $inv->plan ? [
                        'id' => $inv->plan->id,
                        'name' => $inv->plan->name,
                    ] : null,
                    'amount_cents' => $inv->amount_cents,
                    'status' => $inv->status,
                    'payment_method' => $inv->paymentMethod ? [
                        'id' => $inv->paymentMethod->id,
                        'name' => $inv->paymentMethod->name,
                        'provider' => $inv->paymentMethod->provider,
                    ] : null,
                    'payment_proof_path' => $inv->payment_proof_path,
                    'payment_proof_uploaded_at' => $inv->payment_proof_uploaded_at?->toIso8601String(),
                    'due_date' => $inv->due_date?->toDateString(),
                    'period_start' => $inv->period_start?->toDateString(),
                    'period_end' => $inv->period_end?->toDateString(),
                    'paid_at' => $inv->paid_at?->toIso8601String(),
                    'approved_by_admin_name' => $inv->approvedByPlatformAdmin?->name,
                    'notes' => $inv->notes,
                    'created_at' => $inv->created_at?->toIso8601String(),
                ]);
        });

        $totals = TenantManager::runWithoutScope(fn () => [
            'unpaid_count' => SubscriptionInvoice::where('status', SubscriptionInvoice::STATUS_UNPAID)->count(),
            'pending_verification_count' => SubscriptionInvoice::where('status', SubscriptionInvoice::STATUS_PENDING_VERIFICATION)->count(),
            'paid_count' => SubscriptionInvoice::where('status', SubscriptionInvoice::STATUS_PAID)->count(),
        ]);

        $tenantsList = TenantManager::runWithoutScope(function () {
            return Tenant::orderBy('company_name')
                ->get(['id', 'company_name', 'slug', 'plan_id', 'subscription_status', 'subscription_expires_at'])
                ->map(function ($t) {
                    $owner = User::where('tenant_id', $t->id)->where('is_owner', true)->first()
                        ?? User::where('tenant_id', $t->id)->orderBy('id')->first();

                    return [
                        'id' => $t->id,
                        'company_name' => $t->company_name,
                        'slug' => $t->slug,
                        'subscription_status' => $t->subscription_status,
                        'subscription_expires_at' => $t->subscription_expires_at?->toDateString(),
                        'owner_name' => $owner?->name,
                        'owner_email' => $owner?->email,
                    ];
                });
        });

        $defaultPlan = TenantManager::runWithoutScope(
            fn () => Plan::first() ?? Plan::create(['name' => 'Annual Subscription', 'price' => 5_000_000_00])
        );

        return Inertia::render('Superpowers/Subscriptions/Invoices', [
            'invoices' => $invoices,
            'totals' => $totals,
            'filters' => [
                'status' => $statusFilter ?: 'all',
                'search' => $search,
            ],
            'available_tenants' => $tenantsList,
            'default_plan' => [
                'id' => $defaultPlan->id,
                'name' => $defaultPlan->name,
                'price' => $defaultPlan->price,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'tenant_id' => ['required', 'exists:tenants,id'],
            'amount_cents' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
            'send_email' => ['nullable', 'boolean'],
        ]);

        $invoice = TenantManager::runWithoutScope(function () use ($data) {
            $tenant = Tenant::findOrFail($data['tenant_id']);
            $plan = $tenant->plan ?? Plan::first();
            $amount = isset($data['amount_cents']) && $data['amount_cents'] > 0
                ? (int) $data['amount_cents']
                : ($plan?->price ?? 5_000_000_00);

            // Calculate 1 Year Period
            $start = ($tenant->subscription_expires_at && $tenant->subscription_expires_at->isFuture())
                ? $tenant->subscription_expires_at->copy()->addDay()->startOfDay()
                : Carbon::now()->startOfDay();
            $end = $start->copy()->addYear()->endOfDay();
            $dueDate = Carbon::now()->addDays(7)->endOfDay();

            return SubscriptionInvoice::create([
                'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
                'tenant_id' => $tenant->id,
                'plan_id' => $plan?->id,
                'amount_cents' => $amount,
                'status' => SubscriptionInvoice::STATUS_UNPAID,
                'due_date' => $dueDate,
                'period_start' => $start,
                'period_end' => $end,
                'notes' => $data['notes'] ?? 'Langganan Tahunan POgrid (1 Tahun Akses Penuh)',
            ]);
        });

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'invoice.created',
            'target_type' => SubscriptionInvoice::class,
            'target_id' => $invoice->id,
            'metadata' => [
                'invoice_number' => $invoice->invoice_number,
                'tenant_id' => $invoice->tenant_id,
                'amount_cents' => $invoice->amount_cents,
            ],
        ]);

        $emailSent = false;
        if ($request->boolean('send_email', true)) {
            $owner = TenantManager::runWithoutScope(function () use ($invoice) {
                return User::where('tenant_id', $invoice->tenant_id)->where('is_owner', true)->first()
                    ?? User::where('tenant_id', $invoice->tenant_id)->orderBy('id')->first();
            });

            if ($owner) {
                $owner->notify(new SubscriptionInvoiceNotification($invoice));
                $emailSent = true;
            }
        }

        $message = "Invoice 1 Tahun {$invoice->invoice_number} berhasil diterbitkan".($emailSent ? ' dan email tagihan telah dikirim.' : '.');

        return redirect()->back()->with('success', $message);
    }

    public function sendEmail(Request $request, SubscriptionInvoice $invoice)
    {
        $owner = TenantManager::runWithoutScope(function () use ($invoice) {
            return User::where('tenant_id', $invoice->tenant_id)->where('is_owner', true)->first()
                ?? User::where('tenant_id', $invoice->tenant_id)->orderBy('id')->first();
        });

        if (! $owner) {
            return redirect()->back()->with('error', 'Tidak ditemukan kontak user/owner untuk tenant ini.');
        }

        $owner->notify(new SubscriptionInvoiceNotification($invoice));

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'invoice.email_sent',
            'target_type' => SubscriptionInvoice::class,
            'target_id' => $invoice->id,
            'metadata' => [
                'invoice_number' => $invoice->invoice_number,
                'recipient_email' => $owner->email,
            ],
        ]);

        return redirect()->back()->with('success', "Email invoice {$invoice->invoice_number} berhasil dikirim ke {$owner->email}.");
    }

    public function approve(Request $request, SubscriptionInvoice $invoice)
    {
        TenantManager::runWithoutScope(function () use ($invoice, $request) {
            $periodEnd = $invoice->period_end
                ? Carbon::parse($invoice->period_end)->endOfDay()
                : Carbon::now()->addYear()->endOfDay();

            $invoice->update([
                'status' => SubscriptionInvoice::STATUS_PAID,
                'paid_at' => Carbon::now(),
                'approved_by_platform_admin_id' => $request->user('platform')->id,
            ]);

            $tenant = Tenant::withTrashed()->find($invoice->tenant_id);
            if ($tenant) {
                $tenant->update([
                    'subscription_status' => Tenant::STATUS_ACTIVE,
                    'subscription_expires_at' => $periodEnd,
                    'plan_id' => $invoice->plan_id,
                ]);
            }
        });

        // Notify tenant owner
        $owner = TenantManager::runWithoutScope(function () use ($invoice) {
            return User::where('tenant_id', $invoice->tenant_id)->where('is_owner', true)->first()
                ?? User::where('tenant_id', $invoice->tenant_id)->orderBy('id')->first();
        });
        if ($owner) {
            $owner->notify(new SubscriptionActivatedNotification($invoice));
        }

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'invoice.approved_and_activated',
            'target_type' => SubscriptionInvoice::class,
            'target_id' => $invoice->id,
            'metadata' => [
                'invoice_number' => $invoice->invoice_number,
                'tenant_id' => $invoice->tenant_id,
            ],
        ]);

        return redirect()->back()->with('success', "Invoice {$invoice->invoice_number} disetujui, tenant aktif hingga 1 tahun ke depan, dan konfirmasi email terkirim.");
    }

    public function quickExtend(Request $request, SubscriptionInvoice $invoice)
    {
        return $this->approve($request, $invoice);
    }

    public function directExtendTenant(Request $request, Tenant $tenant)
    {
        $invoice = TenantManager::runWithoutScope(function () use ($tenant, $request) {
            $plan = $tenant->plan ?? Plan::first();
            $amount = $plan?->price ?? 5_000_000_00;

            $start = ($tenant->subscription_expires_at && $tenant->subscription_expires_at->isFuture())
                ? $tenant->subscription_expires_at->copy()->addDay()->startOfDay()
                : Carbon::now()->startOfDay();
            $end = $start->copy()->addYear()->endOfDay();

            $inv = SubscriptionInvoice::create([
                'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
                'tenant_id' => $tenant->id,
                'plan_id' => $plan?->id,
                'amount_cents' => $amount,
                'status' => SubscriptionInvoice::STATUS_PAID,
                'due_date' => Carbon::now(),
                'period_start' => $start,
                'period_end' => $end,
                'paid_at' => Carbon::now(),
                'approved_by_platform_admin_id' => $request->user('platform')->id,
                'notes' => 'Perpanjangan Langsung 1 Tahun (Direct Superadmin Action)',
            ]);

            $tenant->update([
                'subscription_status' => Tenant::STATUS_ACTIVE,
                'subscription_expires_at' => $end,
            ]);

            return $inv;
        });

        // Notify tenant owner
        $owner = TenantManager::runWithoutScope(function () use ($tenant) {
            return User::where('tenant_id', $tenant->id)->where('is_owner', true)->first()
                ?? User::where('tenant_id', $tenant->id)->orderBy('id')->first();
        });
        if ($owner) {
            $owner->notify(new SubscriptionActivatedNotification($invoice));
        }

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'tenant.direct_extended_1_year',
            'target_type' => Tenant::class,
            'target_id' => $tenant->id,
            'metadata' => [
                'tenant_slug' => $tenant->slug,
                'new_expires_at' => $tenant->fresh()->subscription_expires_at?->toDateString(),
            ],
        ]);

        return redirect()->back()->with('success', "Tenant {$tenant->company_name} berhasil diperpanjang +1 Tahun (Aktif s/d ".($tenant->fresh()->subscription_expires_at?->format('d/m/Y') ?? '1 Tahun').').');
    }

    public function cancel(Request $request, SubscriptionInvoice $invoice)
    {
        TenantManager::runWithoutScope(function () use ($invoice) {
            $invoice->update(['status' => SubscriptionInvoice::STATUS_CANCELLED]);
        });

        PlatformActivityLog::create([
            'platform_admin_id' => $request->user('platform')->id,
            'action' => 'invoice.cancelled',
            'target_type' => SubscriptionInvoice::class,
            'target_id' => $invoice->id,
            'metadata' => [
                'invoice_number' => $invoice->invoice_number,
            ],
        ]);

        return redirect()->back()->with('success', "Invoice {$invoice->invoice_number} telah dibatalkan.");
    }
}
