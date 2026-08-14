<?php

/**
 * Authoritative workflow/business-rule configuration.
 *
 * The server owns these rules. React receives a client-safe copy via the
 * shared Inertia `workflow` prop (see AppServiceProvider). Never duplicate
 * these values in JavaScript.
 */
return [

    /*
     * Stage → role mapping. Matching is case-insensitive SUBSTRING on the
     * stage name; first matching entry wins. A stage matching no entry falls
     * back to the PRODUCTION role (see WorkerDashboardController::validateStageAccess).
     */
    'stage_role_map' => [
        ['keywords' => ['design', 'gambar', 'draft'], 'roles' => ['DRAFTER']],
        ['keywords' => ['material', 'bahan'], 'roles' => ['PURCHASING']],
        ['keywords' => ['vendor', 'purchasing'], 'roles' => ['PURCHASING']],
        ['keywords' => ['machining', 'cnc'], 'roles' => ['MACHINING', 'CNC', 'PRODUCTION']],
        ['keywords' => ['fabrication', 'fabrikasi'], 'roles' => ['FABRICATION', 'PRODUCTION']],
        ['keywords' => ['assembly', 'perakitan', 'rakit', 'fitting', 'fitter', 'erection'], 'roles' => ['ASSEMBLY']],
        ['keywords' => ['surface', 'heat treatment', 'powder coating', 'painting', 'cat', 'galvanizing', 'galvanis', 'plating', 'anodizing', 'sandblasting', 'electroplating', 'finishing', 'coating'], 'roles' => ['SURFACE']],
        ['keywords' => ['maintenance', 'perawatan', 'repair', 'perbaikan'], 'roles' => ['MAINTENANCE']],
        ['keywords' => ['qc'], 'roles' => ['QC']],
        ['keywords' => ['delivery', 'pengiriman'], 'roles' => ['DELIVERY']],
        ['keywords' => ['finance'], 'roles' => ['FINANCE']],
    ],

    /*
     * Role names treated as "office" on the client (read-only on the floor).
     * Server-side authorization uses roles.level = 'office'; this list exists
     * for UI purposes only.
     */
    'office_roles' => ['OWNER', 'ADMIN', 'SALES', 'MANAGER', 'STAFF'],

    /*
     * Stages considered pre-production (percentage-driven, excluded from the
     * production-weighted progress denominator).
     */
    'pre_production_keywords' => ['design', 'gambar', 'draft', 'material', 'bahan', 'vendor', 'purchasing'],

    /*
     * Deadline-risk rule (EvaluateTimelines cron + Owner dashboard display):
     * an item is AT RISK when days remaining <= risk_days AND progress < risk_progress.
     * RED alerts escalate after escalation_hours.
     */
    'deadline' => [
        'risk_days' => 3,
        'risk_progress' => 70,
        'escalation_hours' => 24,
    ],
];
