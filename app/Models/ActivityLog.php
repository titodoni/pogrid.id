<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use BelongsToTenant;

    public const UPDATED_AT = null;

    protected $table = 'activity_logs';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'project_id',
        'item_id',
        'action',
        'description',
        'metadata',
        'created_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Po::class, 'project_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function scopeOfProject(Builder $query, int $projectId): Builder
    {
        return $query->where('project_id', $projectId);
    }

    public function scopeOfItem(Builder $query, int $itemId): Builder
    {
        return $query->where('item_id', $itemId);
    }
}
