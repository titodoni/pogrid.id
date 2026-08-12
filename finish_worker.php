<?php
$file = 'app/Http/Controllers/WorkerDashboardController.php';
$content = file_get_contents($file);

$replacements = [
    [
        "        if (\$progress->item && \$progress->item->tenant_id !== TenantManager::getTenantId()) {\n            abort(403, 'Unauthorized tenant access.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('view-tenant', \$progress->item ? \$progress->item->tenant_id : TenantManager::getTenantId());"
    ],
    [
        "        \$isPpic = strcasecmp(\$user->role_name ?? '', 'PPIC') === 0 || strcasecmp(\$user->post_name ?? '', 'PPIC') === 0;\n        \$canResolve = \$isPpic || \$user->isOwner() || \$user->isManager() || \$user->isAdmin();\n\n        if (! \$canResolve) {\n            abort(403, 'Only PPIC, Admin, Owner, or Manager can resolve trouble reports.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('resolve-trouble');"
    ],
    [
        "        if (\$user->role_level !== 'office' && \$user->role_name !== 'QC') {\n            abort(403, 'Forbidden: Only QC inspectors can log rework.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('log-rework');"
    ],
    [
        "        if (\$user->role_level !== 'office' && \$user->role_name !== 'DRAFTER') {\n            abort(403, 'Forbidden: Only Drafters can update drafter status.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('update-drafter');"
    ],
    [
        "        if (\$user->role_level !== 'office' && \$user->role_name !== 'PURCHASING') {\n            abort(403, 'Forbidden: Only Purchasing agents can update purchasing status.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('update-purchasing');"
    ],
    [
        "        if (\$user->role_level !== 'office' && ! in_array(\$user->role_name ?? '', ['FINANCE', 'MANAGER'])) {\n            abort(403, 'Forbidden: Only Finance controllers can update finance status.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('update-finance');"
    ],
    [
        "            if (\$item->status !== 'DELIVERED') {\n                abort(403, 'Stage locked: Finance status cannot be updated until at least one item has been delivered.');\n            }",
        "            \\Illuminate\\Support\\Facades\\Gate::authorize('update-finance-status-lock', \$item);"
    ],
    [
        "        if (\$user->role_level !== 'office' && ! in_array(\$user->role_name ?? '', ['FINANCE', 'MANAGER', 'ADMIN'])) {\n            abort(403, 'Only Finance officers or Office managers can view the Finance Ledger.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('view-ledger');"
    ],
    [
        "                        abort(403, \"Stage locked: Only {\$rolesStr} operators can update this stage.\");",
        "                        \\Illuminate\\Auth\\Access\\Response::deny(\"Stage locked: Only {\$rolesStr} operators can update this stage.\")->authorize();"
    ],
    [
        "                    abort(403, 'Stage locked: This is a Vendor job, so other production stages are locked.');",
        "                    \\Illuminate\\Auth\\Access\\Response::deny('Stage locked: This is a Vendor job, so other production stages are locked.')->authorize();"
    ],
    [
        "                    abort(403, 'Stage locked: Fabrication is not required/checked for this item.');",
        "                    \\Illuminate\\Auth\\Access\\Response::deny('Stage locked: Fabrication is not required/checked for this item.')->authorize();"
    ],
    [
        "                    abort(403, 'Stage locked: Machining is not required/checked for this item.');",
        "                    \\Illuminate\\Auth\\Access\\Response::deny('Stage locked: Machining is not required/checked for this item.')->authorize();"
    ],
    [
        "                    abort(403, 'Stage locked: Production requires Design/Drawing to be completed/approved.');",
        "                    \\Illuminate\\Auth\\Access\\Response::deny('Stage locked: Production requires Design/Drawing to be completed/approved.')->authorize();"
    ],
    [
        "                    abort(403, 'Stage locked: Production requires Material/Bahan to be ready/completed.');",
        "                    \\Illuminate\\Auth\\Access\\Response::deny('Stage locked: Production requires Material/Bahan to be ready/completed.')->authorize();"
    ],
    [
        "                            abort(403, \"Stage locked: QC requires all preceding stages to be COMPLETED first. ({\$stage->stage_name} is not done yet)\");",
        "                            \\Illuminate\\Auth\\Access\\Response::deny(\"Stage locked: QC requires all preceding stages to be COMPLETED first. ({\$stage->stage_name} is not done yet)\")->authorize();"
    ],
    [
        "                    abort(403, 'Stage locked: Delivery cannot be updated until QC stage has completed quantities.');",
        "                    \\Illuminate\\Auth\\Access\\Response::deny('Stage locked: Delivery cannot be updated until QC stage has completed quantities.')->authorize();"
    ]
];

foreach ($replacements as $replacement) {
    $content = str_replace($replacement[0], $replacement[1], $content);
}
file_put_contents($file, $content);

// Register the update-finance-status-lock gate in AppServiceProvider
$appServiceProvider = file_get_contents('app/Providers/AppServiceProvider.php');
$gate = <<<GATE
        \\Illuminate\\Support\\Facades\\Gate::define('update-finance-status-lock', function (\$user, \$item) {
            return \$item->status === 'DELIVERED'
                ? \\Illuminate\\Auth\\Access\\Response::allow()
                : \\Illuminate\\Auth\\Access\\Response::deny('Stage locked: Finance status cannot be updated until at least one item has been delivered.');
        });
GATE;

if (strpos($appServiceProvider, 'update-finance-status-lock') === false) {
    $appServiceProvider = preg_replace('/(public function boot\(\): void\s*\{)/', "$1\n$gate", $appServiceProvider);
    file_put_contents('app/Providers/AppServiceProvider.php', $appServiceProvider);
}

echo "WorkerDashboardController replacements applied\n";
