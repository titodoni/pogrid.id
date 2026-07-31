<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeAndTutorialNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $userName,
        public string $companyName,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url('/dashboard');

        return (new MailMessage)
            ->subject('Selamat Datang di POgrid.id - Panduan Memulai & Tutorial')
            ->greeting('Halo, '.$this->userName.' ('.$this->companyName.')!')
            ->line('Terima kasih telah bergabung dengan POgrid.id — sistem pelacakan PO & kontrol produksi pabrik realtime di Indonesia!')
            ->line('Berikut adalah tutorial & panduan singkat 4 langkah untuk memulai pemantauan pabrik Anda:')
            ->line('1️⃣ **Daftarkan Akun Admin**: Sebagai Owner, peran Anda adalah pemantau dan pengambil keputusan. Daftarkan minimal 1 Admin di menu Onboarding/User untuk membuat PO baru.')
            ->line('2️⃣ **Input PO & Tahapan Produksi**: Admin memasukkan daftar barang pesanan (PO) dan menentukan tahapan pengerjaan pabrik (Drafter, Machining, Fabrication, QC, Delivery, dll).')
            ->line('3️⃣ **Operator Lantai Produksi Input Progres**: Operator di bengkel atau lantai produksi mengupdate progres kerja lewat HP masing-masing menggunakan **PIN 4-digit** (tanpa ribet instal aplikasi).')
            ->line('4️⃣ **Pantau Real-Time di Dashboard**: Anda sebagai Owner dapat memantau langsung dari HP/Laptop mana PO yang berstatus Aman, Rawan, atau Kena Pinalti Telat Kirim.')
            ->action('Masuk ke Dashboard POgrid', $url)
            ->line('Jika butuh bantuan teknis atau kustomisasi alur kerja pabrik Anda, tim kami siap membantu Anda kapan pun.')
            ->line('Selamat beroperasi dengan lebih terstruktur dan efisien!');
    }
}
