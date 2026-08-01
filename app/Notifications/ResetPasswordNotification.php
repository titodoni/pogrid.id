<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $token,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url("/reset-password/{$this->token}?email=".urlencode($notifiable->getEmailForPasswordReset()));

        return (new MailMessage)
            ->subject('Atur Ulang Kata Sandi Akun POgrid.id Anda')
            ->greeting('Halo, selamat pagi/siang!')
            ->line('Kami menerima permintaan untuk mengatur ulang kata sandi (password) untuk akun POgrid.id Anda. Jangan khawatir, hal ini biasa terjadi dan kami siap membantu Anda agar bisa segera masuk kembali ke dalam dasbor.')
            ->line('Silakan klik tombol di bawah ini untuk membuat kata sandi baru yang aman dan mudah Anda ingat:')
            ->action('Atur Ulang Kata Sandi', $url)
            ->line('Tautan (link) ini berfungsí selama 60 menit ke depan demi menjaga keamanan akun dan data produksi usaha Anda.')
            ->line('Jika Anda merasa tidak pernah meminta pengaturan ulang kata sandi ini, abaikan saja email ini. Akun Anda tetap aman bersama kami!');
    }
}
