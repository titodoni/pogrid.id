<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemProgress extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'item_progress';

    protected $fillable = [
        'tenant_id',
        'item_id',
        'stage_name',
        'completed_qty',
        'progress_percent',
        'previous_completed_qty',
        'previous_progress_percent',
        'status',
    ];

    protected $casts = [
        'progress_percent' => 'decimal:2',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
