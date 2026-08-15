<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionInvoice extends Model
{
    use HasFactory;

    public const STATUS_UNPAID = 'UNPAID';

    public const STATUS_PENDING_VERIFICATION = 'PENDING_VERIFICATION';

    public const STATUS_PAID = 'PAID';

    public const STATUS_EXPIRED = 'EXPIRED';

    public const STATUS_CANCELLED = 'CANCELLED';

    public const STATUSES = [
        self::STATUS_UNPAID,
        self::STATUS_PENDING_VERIFICATION,
        self::STATUS_PAID,
        self::STATUS_EXPIRED,
        self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        'invoice_number',
        'tenant_id',
        'plan_id',
        'amount_cents',
        'status',
        'payment_method_id',
        'payment_proof_path',
        'payment_proof_uploaded_at',
        'due_date',
        'paid_at',
        'approved_by_platform_admin_id',
        'period_start',
        'period_end',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'due_date' => 'date',
            'period_start' => 'date',
            'period_end' => 'date',
            'paid_at' => 'datetime',
            'payment_proof_uploaded_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function approvedByPlatformAdmin(): BelongsTo
    {
        return $this->belongsTo(PlatformAdmin::class, 'approved_by_platform_admin_id');
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }

    public function isPendingVerification(): bool
    {
        return $this->status === self::STATUS_PENDING_VERIFICATION;
    }

    public function formattedAmount(): string
    {
        return 'Rp '.number_format($this->amount_cents / 100, 0, ',', '.');
    }

    public static function generateInvoiceNumber(): string
    {
        $prefix = 'INV-'.now()->format('Ym').'-';
        $count = static::where('invoice_number', 'like', $prefix.'%')->count() + 1;

        return $prefix.str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }

    public function scopeStatusFilter(Builder $query, ?string $status): Builder
    {
        $token = strtoupper(trim((string) $status));

        if ($token === '' || $token === 'ALL') {
            return $query;
        }

        if (in_array($token, self::STATUSES, true)) {
            return $query->where('status', $token);
        }

        return $query;
    }
}
