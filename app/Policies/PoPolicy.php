<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Po;
use App\Models\Tenant;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Auth\Access\Response;

class PoPolicy
{
    use HandlesAuthorization;

    public function create(User $user)
    {
        if ($user->isOwner() || $user->isManager() || $user->isSales()) {
            return Response::deny('Owners, Managers, and Sales cannot create or broadcast POs. Please assign an Admin user.');
        }

        $tenant = Tenant::find($user->tenant_id);
        if ($tenant && $tenant->isTrialExpired()) {
            return Response::deny('Trial expired: Your trial period has ended and new PO creation is disabled. Please visit billing settings to activate a subscription.');
        }

        return Response::allow();
    }
}
