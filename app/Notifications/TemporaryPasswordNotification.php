<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TemporaryPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $tempPassword,
        public string $email,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url('/login');

        return (new MailMessage)
            ->subject('Welcome to POgrid.id - Your Admin Account')
            ->greeting('Halo!')
            ->line('Akun Admin Anda telah didaftarkan di POgrid.id.')
            ->line('Gunakan email Anda untuk masuk dengan password sementara berikut:')
            ->line('**'.$this->tempPassword.'**')
            ->action('Login ke Dashboard', $url)
            ->line('Demi keamanan, silakan segera ubah password Anda setelah masuk.');
    }
}
