<?php
// Register Gates in AppServiceProvider
$appServiceProvider = file_get_contents('app/Providers/AppServiceProvider.php');
$gates = <<<GATES
        \Illuminate\Support\Facades\Gate::define('manage-company-settings', function (\$user) {
            return !(\$user->isManager() || \$user->isSales())
                ? \Illuminate\Auth\Access\Response::allow()
                : \Illuminate\Auth\Access\Response::deny('Managers and Sales cannot modify company settings.');
        });

        \Illuminate\Support\Facades\Gate::define('manage-workflow-settings', function (\$user) {
            return !(\$user->isManager() || \$user->isSales())
                ? \Illuminate\Auth\Access\Response::allow()
                : \Illuminate\Auth\Access\Response::deny('Managers and Sales cannot modify workflow settings.');
        });

        \Illuminate\Support\Facades\Gate::define('manage-stage-templates', function (\$user) {
            return !(\$user->isManager() || \$user->isSales())
                ? \Illuminate\Auth\Access\Response::allow()
                : \Illuminate\Auth\Access\Response::deny('Managers and Sales cannot manage stage templates.');
        });

        \Illuminate\Support\Facades\Gate::define('create-admin', function (\$user) {
            return \$user->isOwner()
                ? \Illuminate\Auth\Access\Response::allow()
                : \Illuminate\Auth\Access\Response::deny('Only owners can create admin users during onboarding.');
        });

        \Illuminate\Support\Facades\Gate::define('view-tenant', function (\$user, \$tenantId) {
            return \$user->tenant_id === \$tenantId
                ? \Illuminate\Auth\Access\Response::allow()
                : \Illuminate\Auth\Access\Response::deny('Unauthorized tenant access.');
        });

        \Illuminate\Support\Facades\Gate::define('access-office', function (\$user) {
            \$user->load('roleRelation');
            return \$user->role_level === 'office'
                ? \Illuminate\Auth\Access\Response::allow()
                : \Illuminate\Auth\Access\Response::deny('Unauthorized role.');
        });
        
        \Illuminate\Support\Facades\Gate::define('resolve-trouble', function (\$user) {
            return in_array(strtoupper(\$user->role_name ?? ''), ['PPIC', 'ADMIN', 'OWNER', 'MANAGER'])
                ? \Illuminate\Auth\Access\Response::allow()
                : \Illuminate\Auth\Access\Response::deny('Only PPIC, Admin, Owner, or Manager can resolve trouble reports.');
        });

        \Illuminate\Support\Facades\Gate::define('log-rework', function (\$user) {
            return strtoupper(\$user->role_name ?? '') === 'QC'
                ? \Illuminate\Auth\Access\Response::allow()
                : \Illuminate\Auth\Access\Response::deny('Forbidden: Only QC inspectors can log rework.');
        });

        \Illuminate\Support\Facades\Gate::define('update-drafter', function (\$user) {
            return strtoupper(\$user->role_name ?? '') === 'DRAFTER'
                ? \Illuminate\Auth\Access\Response::allow()
                : \Illuminate\Auth\Access\Response::deny('Forbidden: Only Drafters can update drafter status.');
        });

        \Illuminate\Support\Facades\Gate::define('update-purchasing', function (\$user) {
            return strtoupper(\$user->role_name ?? '') === 'PURCHASING'
                ? \Illuminate\Auth\Access\Response::allow()
                : \Illuminate\Auth\Access\Response::deny('Forbidden: Only Purchasing agents can update purchasing status.');
        });

        \Illuminate\Support\Facades\Gate::define('update-finance', function (\$user) {
            return in_array(strtoupper(\$user->role_name ?? ''), ['FINANCE', 'MANAGER', 'OWNER'])
                ? \Illuminate\Auth\Access\Response::allow()
                : \Illuminate\Auth\Access\Response::deny('Forbidden: Only Finance controllers can update finance status.');
        });

        \Illuminate\Support\Facades\Gate::define('view-ledger', function (\$user) {
            return in_array(strtoupper(\$user->role_name ?? ''), ['FINANCE', 'MANAGER', 'OWNER', 'ADMIN'])
                ? \Illuminate\Auth\Access\Response::allow()
                : \Illuminate\Auth\Access\Response::deny('Only Finance officers or Office managers can view the Finance Ledger.');
        });
GATES;

if (strpos($appServiceProvider, 'manage-company-settings') === false) {
    $appServiceProvider = preg_replace('/(public function boot\(\): void\s*\{)/', "$1\n$gates", $appServiceProvider);
    file_put_contents('app/Providers/AppServiceProvider.php', $appServiceProvider);
}
