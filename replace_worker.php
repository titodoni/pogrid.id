<?php
$file = 'app/Http/Controllers/WorkerDashboardController.php';
$content = file_get_contents($file);

$replacements = [
    [
        "        if (\$user->tenant_id !== \$tenant->id) {\n            abort(403, 'Unauthorized tenant access.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('view-tenant', \$tenant->id);"
    ],
    [
        "        if (\$user->tenant_id !== \$tenantId) {\n            abort(403, 'Unauthorized tenant access.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('view-tenant', \$tenantId);"
    ],
    [
        "        if (\$user->role_level !== 'office') {\n            abort(403, 'Unauthorized role.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('access-office');"
    ],
    [
        "        if (! in_array(strtoupper(\$user->role_name ?? ''), ['PPIC', 'ADMIN', 'OWNER', 'MANAGER'])) {\n            abort(403, 'Only PPIC, Admin, Owner, or Manager can resolve trouble reports.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('resolve-trouble');"
    ],
    [
        "        if (strtoupper(\$user->role_name ?? '') !== 'QC') {\n            abort(403, 'Forbidden: Only QC inspectors can log rework.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('log-rework');"
    ],
    [
        "        if (strtoupper(\$user->role_name ?? '') !== 'DRAFTER') {\n            abort(403, 'Forbidden: Only Drafters can update drafter status.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('update-drafter');"
    ],
    [
        "        if (strtoupper(\$user->role_name ?? '') !== 'PURCHASING') {\n            abort(403, 'Forbidden: Only Purchasing agents can update purchasing status.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('update-purchasing');"
    ],
    [
        "        if (! in_array(strtoupper(\$user->role_name ?? ''), ['FINANCE', 'MANAGER', 'OWNER'])) {\n            abort(403, 'Forbidden: Only Finance controllers can update finance status.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('update-finance');"
    ],
    [
        "        if (! in_array(strtoupper(\$user->role_name ?? ''), ['FINANCE', 'MANAGER', 'OWNER', 'ADMIN'])) {\n            abort(403, 'Only Finance officers or Office managers can view the Finance Ledger.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('view-ledger');"
    ]
];

foreach ($replacements as $replacement) {
    $content = str_replace($replacement[0], $replacement[1], $content);
}
file_put_contents($file, $content);
echo "WorkerDashboardController replaced\n";
