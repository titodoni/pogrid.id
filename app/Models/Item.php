<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Item extends Model
{
    use HasFactory, BelongsToTenant;

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
    ];

    protected $casts = [
        'required_stages' => 'array',
        'progress_percent' => 'decimal:2',
    ];

    protected $appends = ['delivered_qty'];

    public function getDeliveredQtyAttribute(): int
    {
        return (int)$this->doItems()->sum('delivered_qty');
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
}
