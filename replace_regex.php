<?php

function replaceFile($file, $patterns) {
    $content = file_get_contents($file);
    foreach ($patterns as $pattern => $replacement) {
        $content = preg_replace($pattern, $replacement, $content);
    }
    file_put_contents($file, $content);
}

// OwnerDashboardController
replaceFile('app/Http/Controllers/OwnerDashboardController.php', [
    "/\s*if \(\\\$authUser->isOwner\(\)\) \{\n\s*abort\(403, 'Only owners can create admin users during onboarding\.'\);\n\s*\}/s" => "\n        \$this->authorize('create-admin');"
]);

// WorkerDashboardController
replaceFile('app/Http/Controllers/WorkerDashboardController.php', [
    "/\s*if \(\\\$user->tenant_id !== (\\\$tenant->id|\\\$tenantId)\) \{\n\s*abort\(403, 'Unauthorized tenant access\.'\);\n\s*\}/s" => "\n        \\Illuminate\\Support\\Facades\\Gate::authorize('view-tenant', \$1);",
    "/\s*if \(! in_array\(strtoupper\(\\\$user->role_name \?\? ''\), \['PPIC', 'ADMIN', 'OWNER', 'MANAGER'\]\)\) \{\n\s*abort\(403, 'Only PPIC, Admin, Owner, or Manager can resolve trouble reports\.'\);\n\s*\}/s" => "\n        \\Illuminate\\Support\\Facades\\Gate::authorize('resolve-trouble');",
    "/\s*if \(strtoupper\(\\\$user->role_name \?\? ''\) !== 'QC'\) \{\n\s*abort\(403, 'Forbidden: Only QC inspectors can log rework\.'\);\n\s*\}/s" => "\n        \\Illuminate\\Support\\Facades\\Gate::authorize('log-rework');",
    "/\s*if \(strtoupper\(\\\$user->role_name \?\? ''\) !== 'DRAFTER'\) \{\n\s*abort\(403, 'Forbidden: Only Drafters can update drafter status\.'\);\n\s*\}/s" => "\n        \\Illuminate\\Support\\Facades\\Gate::authorize('update-drafter');",
    "/\s*if \(strtoupper\(\\\$user->role_name \?\? ''\) !== 'PURCHASING'\) \{\n\s*abort\(403, 'Forbidden: Only Purchasing agents can update purchasing status\.'\);\n\s*\}/s" => "\n        \\Illuminate\\Support\\Facades\\Gate::authorize('update-purchasing');",
    "/\s*if \(! in_array\(strtoupper\(\\\$user->role_name \?\? ''\), \['FINANCE', 'MANAGER', 'OWNER'\]\)\) \{\n\s*abort\(403, 'Forbidden: Only Finance controllers can update finance status\.'\);\n\s*\}/s" => "\n        \\Illuminate\\Support\\Facades\\Gate::authorize('update-finance');",
    "/\s*if \(! in_array\(strtoupper\(\\\$user->role_name \?\? ''\), \['FINANCE', 'MANAGER', 'OWNER', 'ADMIN'\]\)\) \{\n\s*abort\(403, 'Only Finance officers or Office managers can view the Finance Ledger\.'\);\n\s*\}/s" => "\n        \\Illuminate\\Support\\Facades\\Gate::authorize('view-ledger');"
]);

// PpicDashboardController
replaceFile('app/Http/Controllers/PpicDashboardController.php', [
    "/\s*if \(\\\$user->tenant_id !== \\\$tenant->id\) \{\n\s*abort\(403, 'Unauthorized tenant access\.'\);\n\s*\}/s" => "\n        \\Illuminate\\Support\\Facades\\Gate::authorize('view-tenant', \\\$tenant->id);"
]);

// ProfileController
replaceFile('app/Http/Controllers/ProfileController.php', [
    "/\s*if \(\\\$request->user\(\)->is_owner && ! \\\$request->user\(\)->isOwner\(\)\) \{\n\s*abort\(403\);\n\s*\}/s" => "\n        \\Illuminate\\Support\\Facades\\Gate::authorize('modifyOwner', \\\$request->user\(\));" // Wait, I need a UserPolicy instance for modifyOwner
]);

echo "Done regex replace\n";
