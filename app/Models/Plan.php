<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Subscription plan offered to tenants. Price stored in cents to avoid float
 * precision issues. Quotas are nullable meaning "unlimited".
 */
class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'price',
        'quota_users',
        'quota_pos',
        'features',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'quota_users' => 'integer',
            'quota_pos' => 'integer',
            'features' => 'array',
        ];
    }

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);
    }

    /**
     * Human-readable price in Rupiah (assumes price is stored in cents).
     */
    public function formattedPrice(): string
    {
        return 'Rp '.number_format($this->price / 100, 0, ',', '.');
    }

    public function hasUserLimit(): bool
    {
        return $this->quota_users !== null;
    }

    public function hasPoLimit(): bool
    {
        return $this->quota_pos !== null;
    }
}
