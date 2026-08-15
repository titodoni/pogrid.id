<?php

namespace App\Console\Commands;

use App\Models\PlatformAdmin;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;

class CreatePlatformAdminCommand extends Command
{
    protected $signature = 'superpowers:create-admin {--name= : Nama admin} {--email= : Email admin} {--password= : Kata sandi}';

    protected $description = 'Buat akun superadmin untuk panel Superpowers dengan TOTP 2FA.';

    public function handle(): int
    {
        $name = $this->option('name') ?? $this->ask('Nama admin');
        $email = $this->option('email') ?? $this->ask('Email admin');
        $password = $this->option('password') ?? $this->secret('Kata sandi');

        if (empty($name) || empty($email) || empty($password)) {
            $this->error('Nama, email, dan kata sandi wajib diisi.');

            return self::FAILURE;
        }

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Format email tidak valid.');

            return self::FAILURE;
        }

        if (strlen($password) < 8) {
            $this->error('Kata sandi minimal 8 karakter.');

            return self::FAILURE;
        }

        if (PlatformAdmin::where('email', $email)->exists()) {
            $this->error("Admin dengan email {$email} sudah ada.");

            return self::FAILURE;
        }

        // Generate TOTP secret (plaintext — model mutator encrypts on set)
        $google2fa = new Google2FA;
        $secret = $google2fa->generateSecretKey();

        // Create admin with TOTP secret; recovery codes generated via model method.
        $admin = PlatformAdmin::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'is_active' => true,
            'two_factor_secret' => $secret,
        ]);

        // Generate and persist recovery codes (hashed via model method).
        $recoveryCodes = $admin->generateRecoveryCodes();
        $admin->save();

        // Generate QR code URL for authenticator app
        $qrCodeUrl = $google2fa->getQRCodeUrl(
            config('app.name', 'POGrid Superpowers'),
            $email,
            $secret
        );

        $this->newLine();
        $this->info('✓ Admin superpowers berhasil dibuat!');
        $this->newLine();
        $this->line("ID: {$admin->id}");
        $this->line("Nama: {$admin->name}");
        $this->line("Email: {$admin->email}");
        $this->newLine();
        $this->warn('─── TOTP 2FA Setup ───');
        $this->line("Secret: {$secret}");
        $this->newLine();
        $this->line('Scan QR code berikut dengan aplikasi authenticator (Google Authenticator, Authy, dll):');
        $this->newLine();
        $this->line($qrCodeUrl);
        $this->newLine();
        $this->warn('─── Recovery Codes (simpan dengan aman) ───');
        foreach ($recoveryCodes as $code) {
            $this->line("  • {$code}");
        }
        $this->newLine();
        $this->info('Simpan secret dan recovery codes di tempat yang aman. Ini tidak akan ditampilkan lagi.');

        return self::SUCCESS;
    }
}
