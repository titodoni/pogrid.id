<?php
$files = [
    'app/Http/Controllers/OwnerDashboardController.php' => [
        [
            "        if (auth()->user()->isManager() || auth()->user()->isSales()) {\n            abort(403, 'Managers and Sales cannot modify company settings.');\n        }",
            "        \\Illuminate\\Support\\Facades\\Gate::authorize('manage-company-settings');"
        ],
        [
            "        if (auth()->user()->isManager() || auth()->user()->isSales()) {\n            abort(403, 'Managers and Sales cannot modify workflow settings.');\n        }",
            "        \\Illuminate\\Support\\Facades\\Gate::authorize('manage-workflow-settings');"
        ],
        [
            "        if (\$user->isOwner() || \$user->isManager() || \$user->isSales()) {\n            abort(403, 'Owners, Managers, and Sales cannot create or broadcast POs. Please assign an Admin user.');\n        }",
            "        \$this->authorize('create', \\App\\Models\\Po::class);"
        ],
        [
            "        if (\$tenant && \$tenant->isTrialExpired()) {\n            abort(403, 'Trial expired: Your trial period has ended and new PO creation is disabled. Please visit billing settings to activate a subscription.');\n        }",
            "        // Trial check is now in PoPolicy::create()"
        ],
        [
            "        if (\$authUser->isManager() || \$authUser->isSales()) {\n            abort(403, 'Managers and Sales cannot manage users.');\n        }",
            "        \$this->authorize('manage', \\App\\Models\\User::class);"
        ],
        [
            "        if (\$actor->isManager() || \$actor->isSales()) {\n            abort(403, 'Managers and Sales cannot manage users.');\n        }",
            "        \$this->authorize('manage', \\App\\Models\\User::class);"
        ],
        [
            "        if (\$user->is_owner && ! \$actor->isOwner()) {\n            abort(403, 'Only owners can modify owner accounts.');\n        }",
            "        \$this->authorize('modifyOwner', \$user);"
        ],
        [
            "        if (\$user->is_owner && ! \$actor->isOwner()) {\n            abort(403, 'Only owners can delete owner accounts.');\n        }",
            "        \$this->authorize('delete', \$user);"
        ],
        [
            "        if (\$user->id === auth()->id()) {\n            abort(403, 'You cannot delete yourself.');\n        }",
            ""
        ],
        [
            "        if (auth()->user()->isSales()) {\n            abort(403, 'Sales accounts are strictly read-only and cannot cancel production items.');\n        }",
            "        \$this->authorize('cancel', \$item);"
        ],
        [
            "        if ((float) \$item->progress_percent > 0.00) {\n            abort(403, 'Sunk-Cost Cancel Protection: Items with progress > 0% cannot be cancelled. You must terminate midway instead.');\n        }",
            "        // Sunk-cost check is now in ItemPolicy::cancel()"
        ],
        [
            "        if (auth()->user()->isSales()) {\n            abort(403, 'Sales accounts are strictly read-only and cannot terminate production items.');\n        }",
            "        \$this->authorize('terminate', \$item);"
        ],
        [
            "        if (auth()->user()->isSales()) {\n            abort(403, 'Sales accounts are strictly read-only and cannot perform batch operations.');\n        }",
            "        \$this->authorize('batchAction', \\App\\Models\\Item::class);"
        ],
        [
            "        if (auth()->user()->isManager() || auth()->user()->isSales()) {\n            abort(403, 'Managers and Sales cannot manage stage templates.');\n        }",
            "        \\Illuminate\\Support\\Facades\\Gate::authorize('manage-stage-templates');"
        ],
    ]
];

foreach ($files as $file => $replacements) {
    $content = file_get_contents($file);
    foreach ($replacements as $replacement) {
        $content = str_replace($replacement[0], $replacement[1], $content);
    }
    file_put_contents($file, $content);
}
echo "OwnerDashboardController replaced\n";
