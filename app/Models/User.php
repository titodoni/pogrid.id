<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use BelongsToTenant, HasFactory, Notifiable;

    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'username',
        'password',
        'pin',
        'role_id',
        'post_id',
        'is_owner',
    ];

    protected $hidden = [
        'password',
        'pin',
        'remember_token',
    ];

    protected $appends = [
        'role_name',
        'role_level',
        'post_name',
        'role_display_name',
        'role_display_name_id',
        'post_display_name',
        'post_display_name_id',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'pin' => 'hashed',
            'is_owner' => 'boolean',
        ];
    }

    public function roleRelation(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function postRelation(): BelongsTo
    {
        return $this->belongsTo(Post::class, 'post_id');
    }

    public function getRoleNameAttribute(): string
    {
        return $this->roleRelation?->name ?? 'WORKER';
    }

    public function getRoleLevelAttribute(): string
    {
        return $this->roleRelation?->level ?? 'production';
    }

    public function getPostNameAttribute(): ?string
    {
        return $this->postRelation?->name;
    }

    public function getRoleDisplayNameAttribute(): string
    {
        return $this->roleRelation?->display_name ?? 'Worker';
    }

    public function getRoleDisplayNameIdAttribute(): ?string
    {
        return $this->roleRelation?->display_name_id;
    }

    public function getPostDisplayNameAttribute(): ?string
    {
        return $this->postRelation?->display_name;
    }

    public function getPostDisplayNameIdAttribute(): ?string
    {
        return $this->postRelation?->display_name_id;
    }

    public function isOwner(): bool
    {
        return (bool) ($this->is_owner ?? false);
    }

    public function isWorker(): bool
    {
        return $this->roleRelation?->level === 'production';
    }

    public function isQC(): bool
    {
        return $this->roleRelation?->name === 'QC';
    }

    public function isManager(): bool
    {
        return ! $this->isOwner() && $this->roleRelation?->name === 'STAFF' && $this->postRelation?->name === 'Manager';
    }
}
