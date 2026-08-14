<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    use HandlesAuthorization;

    public function manage(User $user)
    {
        return ! ($user->isManager() || $user->isSales())
            ? Response::allow()
            : Response::deny('Managers and Sales cannot manage users.');
    }

    public function modifyOwner(User $user, User $model)
    {
        if ($model->is_owner && ! $user->isOwner()) {
            return Response::deny('Only owners can modify owner accounts.');
        }

        return Response::allow();
    }

    public function delete(User $user, User $model)
    {
        if ($model->is_owner && ! $user->isOwner()) {
            return Response::deny('Only owners can delete owner accounts.');
        }
        if ($user->id === $model->id) {
            return Response::deny('You cannot delete yourself.');
        }

        return Response::allow();
    }
}
