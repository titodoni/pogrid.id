<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentMethod extends Model
{
    use HasFactory;

    public const TYPE_BANK_TRANSFER = 'bank_transfer';

    public const TYPE_PAYMENT_GATEWAY = 'payment_gateway';

    public const TYPES = [
        self::TYPE_BANK_TRANSFER,
        self::TYPE_PAYMENT_GATEWAY,
    ];

    public const PROVIDERS = [
        'mayar',
        'bca',
        'mandiri',
        'bri',
        'bni',
        'midtrans',
        'xendit',
        'other',
    ];

    protected $fillable = [
        'name',
        'type',
        'provider',
        'account_number',
        'account_holder',
        'instructions',
        'config',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'config' => 'encrypted:array',
        ];
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(SubscriptionInvoice::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }

    public function scopeBankTransfers(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_BANK_TRANSFER);
    }

    public function scopeGateways(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_PAYMENT_GATEWAY);
    }
}
