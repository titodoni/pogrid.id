/**
 * Server-owned workflow configuration bridge.
 *
 * The authoritative definitions live in config/workflow.php and are shared
 * with every page via the Inertia `workflow` prop (AppServiceProvider).
 * FlashMessages (mounted on every page) pushes the prop into this module
 * once per render cycle; utilities read it via getWorkflowConfig().
 *
 * Do NOT hardcode copies of these rules in components.
 */

export interface StageRoleEntry {
    keywords: string[];
    roles: string[];
}

export interface WorkflowConfig {
    stage_role_map: StageRoleEntry[];
    office_roles: string[];
    pre_production_keywords: string[];
    deadline: {
        risk_days: number;
        risk_progress: number;
        escalation_hours: number;
    };
    item_statuses: string[];
    po_statuses: string[];
}

let config: WorkflowConfig | null = null;

export function setWorkflowConfig(cfg: WorkflowConfig): void {
    config = cfg;
}

/**
 * Empty-safe fallback so pages without the prop render instead of crashing;
 * the server remains the enforcement point regardless.
 */
const FALLBACK: WorkflowConfig = {
    stage_role_map: [],
    office_roles: [],
    pre_production_keywords: [],
    deadline: { risk_days: 3, risk_progress: 70, escalation_hours: 24 },
    item_statuses: [],
    po_statuses: [],
};

export function getWorkflowConfig(): WorkflowConfig {
    return config ?? FALLBACK;
}
