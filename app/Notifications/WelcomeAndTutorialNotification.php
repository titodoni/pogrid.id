<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeAndTutorialNotification extends Notification
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
            ->subject('Selamat Datang di POgrid.id - Langkah Mudah Menerapkan Sistem di Pabrik Anda')
            ->greeting('Halo, '.$this->userName.' ('.$this->companyName.')!')
            ->line('Senang sekali menyambut Anda di keluarga POgrid.id. Mulai hari ini, Anda tidak perlu lagi repot atau tebak-tebakan memantau status pesanan dan progres kerja di lantai produksi.')
            ->line('Untuk memulai dengan gampang dan santai, cukup ikuti 3 langkah praktis berikut (tanpa rumit dan tanpa perlu instalasi aplikasi di HP operator):')
            ->line('1️⃣ **Buatkan Akun untuk Staf Admin**: Dari dasbor Anda, daftarkan akun untuk Staf Admin Anda. Tugas Admin adalah memasukkan daftar barang pesanan (PO) dan menentukan alur pengerjaannya (misal: Potong Bahan, Las, Bubut, QC, Kirim).')
            ->line('2️⃣ **Operator Lapangan Input Progres Lewat HP**: Staf di bengkel atau lantai produksi tinggal membuka web lewat browser di HP masing-masing, lalu masuk menggunakan **PIN 4-digit** yang mudah dipahami (tanpa ribet unduh aplikasi).')
            ->line('3️⃣ **Pantau Tenang dari Layar Anda**: Sebagai Owner atau Pimpinan, Anda tinggal duduk tenang memantau dasbor secara langsung dari laptop atau HP Anda untuk melihat mana pesanan yang lancar, rawan terlambat, atau sedang ada kendala di lapangan.')
            ->action('Masuk ke Dashboard Sekarang', $url)
            ->line('Jika Anda memiliki pertanyaan atau ingin berkonsultasi tentang cara penyusunan alur kerja yang tepat untuk bengkel atau pabrik Anda, cukup balas email ini. Tim kami siap membantu Anda dengan senang hati!')
            ->line('Salam sukses dan lancar selalu untuk produksi pabrik Anda!');
    }
}
