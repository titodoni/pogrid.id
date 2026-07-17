<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_name',
        'slug',
        'subscription_status',
        'trial_ends_at',
        'workflow_settings',
    ];

    protected $casts = [
        'trial_ends_at' => 'datetime',
        'workflow_settings' => 'array',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function pos(): HasMany
    {
        return $this->hasMany(Po::class);
    }
}
