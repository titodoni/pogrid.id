<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TemporaryPasswordNotification extends Notification
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
            ->subject('Selamat! Akun Admin POgrid.id Anda Telah Aktif')
            ->greeting('Halo, selamat bergabung di tim POgrid.id!')
            ->line('Pimpinan atau Owner perusahaan Anda baru saja mendaftarkan Anda sebagai Staf Admin di sistem pelacakan produksi POgrid.id.')
            ->line('Dengan sistem ini, pekerjaan Anda dalam mengelola surat pesanan (PO) dan memantau progres lapangan akan jadi jauh lebih gampang, rahasia anti-lupa, dan sangat teratur tanpa harus berkeliling bengkel atau pabrik secara manual.')
            ->line('Berikut adalah kata sandi (password) sementara yang dapat Anda gunakan untuk masuk pertama kali dengan email Anda:')
            ->line('👉 **'.$this->tempPassword.'**')
            ->action('Masuk ke Dashboard POgrid', $url)
            ->line('💡 **Tips Aman**: Setelah berhasil masuk untuk pertama kalinya, silakan langsung menuju menu Pengaturan Akun atau Profil Anda untuk mengubah kata sandi ini ke kata sandi pribadi yang gampang Anda ingat namun aman.')
            ->line('Selamat bekerja dengan lebih lancar dan efisien!');
    }
}
