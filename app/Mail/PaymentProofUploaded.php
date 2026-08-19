<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;

class PaymentProofUploaded extends Mailable
{
    use Queueable, SerializesModels;

    public $invoice;
    public $tenant;

    /**
     * Create a new message instance.
     */
    public function __construct(SubscriptionInvoice $invoice, Tenant $tenant)
    {
        $this->invoice = $invoice;
        $this->tenant = $tenant;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Bukti Pembayaran Baru: ' . $this->tenant->name,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.payment-proof-uploaded',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        if ($this->invoice && $this->invoice->payment_proof_path) {
            return [
                \Illuminate\Mail\Mailables\Attachment::fromStorageDisk('public', $this->invoice->payment_proof_path)
            ];
        }

        return [];
    }
}
