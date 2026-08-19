<x-mail::message>
# Bukti Pembayaran Baru Diunggah

Tenant **{{ $tenant->name }}** ({{ $tenant->slug }}) baru saja mengunggah bukti pembayaran manual.

**Detail Invoice:**
- **No. Invoice:** {{ $invoice->invoice_number }}
- **Nominal:** Rp {{ number_format($invoice->amount_cents / 100, 0, ',', '.') }}
- **Waktu Upload:** {{ $invoice->payment_proof_uploaded_at->format('d/m/Y H:i') }}
- **Link File:** [Lihat Bukti Transfer (Browser)]({{ asset('storage/' . $invoice->payment_proof_path) }})

<x-mail::button :url="config('app.url') . '/superpowers/login'">
Login Superadmin
</x-mail::button>

Silakan periksa halaman Superadmin -> Invoices untuk memverifikasi pembayaran ini.

Terima kasih,<br>
Sistem Notifikasi {{ config('app.name') }}
</x-mail::message>
