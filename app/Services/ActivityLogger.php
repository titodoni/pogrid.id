<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Alert;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    public static function log(
        string $action,
        string $description,
        ?array $metadata = null,
        ?Model $actor = null,
        ?Po $project = null,
        ?Item $item = null,
        ?ItemProgress $itemProgress = null,
        ?int $tenantId = null
    ): ?ActivityLog {
        $actor = $actor ?: Auth::user();
        $tenantId = $tenantId ?: (TenantManager::getTenantId() ?: ($project?->tenant_id ?? $item?->tenant_id));

        if (! $tenantId) {
            return null;
        }

        return ActivityLog::create([
            'tenant_id' => $tenantId,
            'user_id' => $actor?->id,
            'project_id' => $project?->id ?? $item?->po_id ?? $itemProgress?->item?->po_id ?? null,
            'item_id' => $item?->id ?? $itemProgress?->item_id ?? null,
            'action' => $action,
            'description' => mb_substr($description, 0, 500),
            'metadata' => $metadata,
        ]);
    }

    public static function logProgress(ItemProgress $progress): ?ActivityLog
    {
        $item = $progress->item;

        return self::log(
            action: 'progress_logged',
            description: sprintf(
                "Progress '%s' — %d pcs complete, %s%%",
                $progress->stage_name,
                (int) $progress->completed_qty,
                rtrim(rtrim(number_format((float) $progress->progress_percent, 2, '.', ''), '0'), '.').'%',
            ),
            metadata: [
                'stage' => $progress->stage_name,
                'completed_qty' => (int) $progress->completed_qty,
                'progress_percent' => (float) $progress->progress_percent,
            ],
            item: $item,
        );
    }

    public static function logItemCreated(Item $item): ?ActivityLog
    {
        return self::log(
            'item_created',
            sprintf("Item added — '%s' (qty %d)", $item->item_name, (int) $item->target_qty),
            metadata: ['target_qty' => (int) $item->target_qty],
            project: $item->po,
            item: $item,
        );
    }

    public static function logItemStatus(Item $item, string $from, string $to): ?ActivityLog
    {
        return self::log(
            'item_status_changed',
            sprintf("'%s' status %s → %s", $item->item_name, $from ?: '—', $to),
            metadata: ['from' => $from, 'to' => $to],
            project: $item->po,
            item: $item,
        );
    }

    public static function logPoCreated(Po $po): ?ActivityLog
    {
        return self::log(
            'project_created',
            sprintf('Project created: %s — %s', $po->po_number, $po->client_name),
            metadata: ['po_number' => $po->po_number, 'client_name' => $po->client_name],
            project: $po,
        );
    }

    public static function logAlert(Alert $alert): ?ActivityLog
    {
        $item = $alert->item;

        return self::log(
            'alert_created',
            sprintf('%s alert — %s', $alert->severity, $alert->message),
            metadata: ['severity' => $alert->severity, 'reason_type' => $alert->reason_type],
            actor: $alert->user,
            project: $item?->po,
            item: $item,
        );
    }

    public static function logUserCreated(User $user): ?ActivityLog
    {
        return self::log(
            'user_created',
            sprintf('User created: %s (%s)', $user->name, $user->role_name),
            metadata: ['role' => $user->role_name, 'post' => $user->post_name],
        );
    }
}
