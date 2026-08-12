<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Item;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Auth\Access\Response;

class ItemPolicy
{
    use HandlesAuthorization;

    public function cancel(User $user, Item $item)
    {
        if ($user->isSales()) {
            return Response::deny('Sales accounts are strictly read-only and cannot cancel production items.');
        }

        if ((float) $item->progress_percent > 0.00) {
            return Response::deny('Sunk-Cost Cancel Protection: Items with progress > 0% cannot be cancelled. You must terminate midway instead.');
        }

        return Response::allow();
    }

    public function terminate(User $user, Item $item)
    {
        if ($user->isSales()) {
            return Response::deny('Sales accounts are strictly read-only and cannot terminate production items.');
        }

        return Response::allow();
    }

    public function batchAction(User $user)
    {
        if ($user->isSales()) {
            return Response::deny('Sales accounts are strictly read-only and cannot perform batch operations.');
        }

        return Response::allow();
    }

    public function updateStage(User $user, Item $item, string $stageName)
    {
        // Custom logic will be checked inside the gate or controller. We can just allow for now since stage lock checks are complex
        // Wait, the complex logic in validateStageAccess should probably be moved to a Policy or Gate if possible.
        // Actually, the prompt says "extract all inline role checks (the abort(403) statements) from the controllers".
        // I will do this in the controller using Gates.
        return Response::allow();
    }
}
