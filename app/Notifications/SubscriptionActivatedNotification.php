<?php

namespace App\Notifications;

use App\Models\SubscriptionInvoice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionActivatedNotification extends Notification
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
        $invoice = $this->invoice->loadMissing('tenant');
        $tenant = $invoice->tenant;
        $expiryFormatted = $tenant?->subscription_expires_at ? $tenant->subscription_expires_at->format('d/m/Y') : now()->addYear()->format('d/m/Y');

        return (new MailMessage)
            ->subject("Pembayaran Berhasil & Langganan Aktif - POgrid.id ({$tenant?->company_name})")
            ->greeting('Halo, '.($notifiable->name ?? 'Pimpinan / Owner').'!')
            ->line("Pembayaran untuk Invoice **{$invoice->invoice_number}** telah berhasil diverifikasi oleh tim POgrid.")
            ->line('Langganan pabrik Anda telah **AKTIF PENUH** untuk periode 1 tahun ke depan:')
            ->line("• **Masa Berlaku Hingga**: **{$expiryFormatted}**")
            ->line('• **Status Akun**: AKTIF (Akses Office & Lantai Produksi)')
            ->action('Buka Dashboard POgrid', url('/dashboard'))
            ->line('Semoga operasional dan produktivitas bengkel/pabrik Anda semakin lancar bersama POgrid.id!')
            ->line('Salam hangat, Tim POgrid Indonesia.');
    }
}
