<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_name',
        'slug',
        'logo_path',
        'theme',
        'subscription_status',
        'plan_id',
        'trial_ends_at',
        'workflow_settings',
        'attribution_source',
        'attribution_medium',
        'attribution_campaign',
        'attribution_content',
        'attribution_ref',
        'attributed_at',
    ];

    protected $casts = [
        'trial_ends_at' => 'datetime',
        'attributed_at' => 'datetime',
        'workflow_settings' => 'array',
    ];

    /**
     * Active subscription states — mutations are allowed.
     */
    public const STATUS_ACTIVE = 'ACTIVE';

    public const STATUS_PAID = 'PAID';

    public const STATUS_SUBSCRIBED = 'SUBSCRIBED';

    /**
     * Read-only states — tenant can still log in, but mutations are blocked.
     */
    public const STATUS_READONLY = 'READONLY';

    /**
     * Statuses that permit mutations. Single source of truth — controllers,
     * validation rules, and queries must derive from this list.
     *
     * @var list<string>
     */
    public const ACTIVE_STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_PAID,
        self::STATUS_SUBSCRIBED,
    ];

    /**
     * Statuses a superadmin may assign to a tenant.
     *
     * @var list<string>
     */
    public const ASSIGNABLE_STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_PAID,
        self::STATUS_SUBSCRIBED,
        self::STATUS_READONLY,
    ];

    /** Constrain to tenants whose subscription permits mutations. */
    public function scopeActiveSubscription(Builder $query): Builder
    {
        return $query->whereIn('subscription_status', self::ACTIVE_STATUSES);
    }

    /** Constrain to tenants whose subscription blocks mutations. */
    public function scopeReadonlySubscription(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->whereNotIn('subscription_status', self::ACTIVE_STATUSES)
                ->orWhereNull('subscription_status');
        });
    }

    /**
     * Apply a superadmin list filter token to the query. Shared by the
     * Superpowers tenant and subscription listings so both interpret the
     * same tokens identically.
     *
     * Tokens: `all` (or empty) · `active` · `readonly` · `deleted` ·
     * any concrete status from {@see self::ASSIGNABLE_STATUSES}.
     */
    public function scopeSubscriptionFilter(Builder $query, ?string $filter): Builder
    {
        $token = strtolower(trim((string) $filter));

        if ($token === '' || $token === 'all') {
            return $query;
        }

        if ($token === 'deleted') {
            return $query->whereNotNull('deleted_at');
        }

        if ($token === 'active') {
            return $query->whereNull('deleted_at')->activeSubscription();
        }

        if ($token === 'readonly') {
            return $query->whereNull('deleted_at')->readonlySubscription();
        }

        $status = strtoupper($token);

        if (in_array($status, self::ASSIGNABLE_STATUSES, true)) {
            return $query->whereNull('deleted_at')
                ->where('subscription_status', $status);
        }

        return $query;
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function pos(): HasMany
    {
        return $this->hasMany(Po::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function isTrialExpired(): bool
    {
        if ($this->hasActiveSubscription()) {
            return false;
        }

        if ($this->trial_ends_at && $this->trial_ends_at->isPast()) {
            return true;
        }

        return false;
    }

    /**
     * Whether the tenant's subscription is in an active (mutation-allowed) state.
     */
    public function hasActiveSubscription(): bool
    {
        return in_array(
            strtoupper($this->subscription_status ?? ''),
            self::ACTIVE_STATUSES,
            true,
        );
    }

    /**
     * Read-only mode blocks mutations while still permitting login and reads.
     * Triggered when a tenant stops their subscription (superadmin sets
     * subscription_status to anything outside the active set).
     */
    public function isReadonly(): bool
    {
        return ! $this->hasActiveSubscription();
    }
}
