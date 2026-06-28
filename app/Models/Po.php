<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Po extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'pos';

    protected $fillable = [
        'tenant_id',
        'po_number',
        'client_name',
        'global_deadline',
        'status',
    ];

    protected $casts = [
        'global_deadline' => 'date',
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
