<?php
$file = 'app/Http/Controllers/WorkerDashboardController.php';
$content = file_get_contents($file);

$replacements = [
    [
        "        if (\$user->role_level !== 'office' && strcasecmp(\$user->role_name ?? '', 'DRAFTER') !== 0) {\n            abort(403, 'Forbidden: Only Drafters can update drafter status.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('update-drafter');"
    ],
    [
        "        if (\$user->role_level !== 'office' && ! in_array(strtoupper(\$user->role_name ?? ''), ['FINANCE', 'MANAGER', 'OWNER'])) {\n            abort(403, 'Forbidden: Only Finance controllers can update finance status.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('update-finance');"
    ],
    [
        "            if (\$item->status !== 'DELIVERED') {\n                abort(403, 'Stage locked: Finance status cannot be updated until at least one item has been delivered.');\n            }",
        "            \\Illuminate\\Support\\Facades\\Gate::authorize('update-finance-status-lock', \$item);"
    ],
    [
        "        if (\$user->role_level !== 'office' && ! in_array(strtoupper(\$user->role_name ?? ''), ['FINANCE', 'MANAGER', 'OWNER', 'ADMIN'])) {\n            abort(403, 'Only Finance officers or Office managers can view the Finance Ledger.');\n        }",
        "        \\Illuminate\\Support\\Facades\\Gate::authorize('view-ledger');"
    ]
];

foreach ($replacements as $replacement) {
    $content = str_replace($replacement[0], $replacement[1], $content);
}
file_put_contents($file, $content);
echo "Fixed remaining\n";
