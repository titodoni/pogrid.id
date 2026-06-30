<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Po extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'pos';

    protected $fillable = [
        'tenant_id',
        'po_number',
        'external_po_number',
        'client_name',
        'global_deadline',
        'status',
        'is_urgent',
    ];

    protected $casts = [
        'global_deadline' => 'date',
        'is_urgent' => 'boolean',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function deliveryOrders(): HasMany
    {
        return $this->hasMany(DeliveryOrder::class);
    }
}
