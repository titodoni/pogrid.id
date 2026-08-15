<?php

namespace App\Notifications;

use App\Models\PaymentMethod;
use App\Models\SubscriptionInvoice;
use App\Services\TenantManager;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionInvoiceNotification extends Notification
{
    use Queueable;

    public function __construct(
        public SubscriptionInvoice $invoice,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $invoice = $this->invoice->loadMissing(['tenant', 'plan']);
        $tenant = $invoice->tenant;
        $amountFormatted = 'Rp '.number_format($invoice->amount_cents / 100, 0, ',', '.');
        $periodStartFormatted = $invoice->period_start ? $invoice->period_start->format('d/m/Y') : now()->format('d/m/Y');
        $periodEndFormatted = $invoice->period_end ? $invoice->period_end->format('d/m/Y') : now()->addYear()->format('d/m/Y');
        $dueDateFormatted = $invoice->due_date ? $invoice->due_date->format('d/m/Y') : now()->addDays(7)->format('d/m/Y');

        $activePaymentMethods = TenantManager::runWithoutScope(
            fn () => PaymentMethod::active()->get()
        );

        $mail = (new MailMessage)
            ->subject("Tagihan Langganan POgrid (1 Tahun) - {$invoice->invoice_number} - {$tenant?->company_name}")
            ->greeting('Halo, '.($notifiable->name ?? 'Pimpinan / Owner').' ('.($tenant?->company_name ?? 'Tenant').')')
            ->line('Berikut adalah rincian tagihan langganan tahunan untuk akses platform **POgrid.id**:')
            ->line("• **Nomor Invoice**: {$invoice->invoice_number}")
            ->line('• **Paket**: Langganan 1 Tahun (Akses Penuh Pabrik & Operasional)')
            ->line("• **Periode Langganan**: {$periodStartFormatted} s/d {$periodEndFormatted}")
            ->line("• **Total Tagihan**: **{$amountFormatted}**")
            ->line("• **Batas Waktu Pembayaran (Due Date)**: {$dueDateFormatted}");

        if ($activePaymentMethods->isNotEmpty()) {
            $mail->line('---');
            $mail->line('**Rekening Resmi Pembayaran POgrid:**');
            foreach ($activePaymentMethods as $pm) {
                if ($pm->type === PaymentMethod::TYPE_BANK_TRANSFER) {
                    $mail->line("• **{$pm->name}**: `{$pm->account_number}` (a/n {$pm->account_holder})");
                } elseif ($pm->provider === 'mayar') {
                    $mail->line('• **Mayar.id**: Pembayaran instan via QRIS / Virtual Account di halaman billing.');
                }
            }
            $mail->line('Sertakan kode referensi: `REF: '.strtoupper($tenant?->slug ?? 'PO').'` pada berita transfer.');
        }

        $mail->action('Lihat Tagihan & Upload Bukti Bayar', url('/billing'))
            ->line('Setelah melakukan transfer, silakan unggah bukti pembayaran melalui tombol di atas agar akun dapat langsung aktif.')
            ->line('Jika membutuhkan faktur khusus atau memiliki pertanyaan, silakan balas email ini.')
            ->line('Terima kasih atas kepercayaan Anda menggunakan POgrid.id!');

        return $mail;
    }
}
