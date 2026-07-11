<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Item extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'po_id',
        'item_name',
        'target_qty',
        'item_type',
        'required_stages',
        'progress_percent',
        'status',
        'vendor_name',
        'vendor_phone',
        'invoice_status',
        'payment_status',
        'purchasing_status',
        'drafter_status',
    ];

    protected $casts = [
        'required_stages' => 'array',
        'progress_percent' => 'decimal:2',
        'purchasing_status' => 'string',
        'drafter_status' => 'string',
    ];

    protected $appends = ['delivered_qty'];

    public function getDeliveredQtyAttribute(): int
    {
        return (int) $this->doItems()->sum('delivered_qty');
    }

    public function po(): BelongsTo
    {
        return $this->belongsTo(Po::class, 'po_id');
    }

    public function itemProgresses(): HasMany
    {
        return $this->hasMany(ItemProgress::class);
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    public function doItems(): HasMany
    {
        return $this->hasMany(DoItem::class);
    }

    public function getItemNameAttribute($value): string
    {
        return trim(preg_replace('/\s*\((cnc|fabrication|bubut|fab|gambar|design|drawing|draft|material|purchasing|qc|delivery)[^)]*\)/i', '', $value));
    }
}
