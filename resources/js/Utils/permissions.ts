/**
 * Client-side stage permission helpers.
 *
 * These mirror server enforcement (WorkerDashboardController::validateStageAccess)
 * purely for UI affordance (locking buttons). All rule inputs — the stage-role
 * map and office-role list — come from the server via the Inertia `workflow`
 * prop (see Utils/workflow.ts). Never hardcode stage→role mappings here.
 *
 * Matching semantics intentionally mirror the server: case-insensitive
 * substring, first matching entry wins.
 */
import { getWorkflowConfig } from './workflow';

interface Stage {
    id: number;
    stage_name: string;
    completed_qty: number;
    progress_percent: string;
    status: string;
    previous_completed_qty?: number | null;
    previous_progress_percent?: string | null;
}

interface Alert {
    id: number;
    severity: string;
    reason_type?: string | null;
    message?: string | null;
    is_resolved: boolean;
}

interface Item {
    id: number;
    item_name: string;
    target_qty: number;
    item_type: string;
    progress_percent: string;
    status: string;
    purchasing_status?: string | null;
    drafter_status?: string | null;
    invoice_status?: string;
    payment_status?: string;
    delivery_status?: string | null;
    delivered_qty?: number;
    invoiced_qty?: number;
    alerts: Alert[];
    po?: {
        po_number: string;
        external_po_number?: string | null;
        client_name: string;
        global_deadline: string;
        is_urgent?: boolean | null;
    };
    item_progresses: Stage[];
}

function stageRoleMap() {
    return getWorkflowConfig().stage_role_map;
}

function officeRoles(): string[] {
    return getWorkflowConfig().office_roles;
}

/** Server semantics: case-insensitive substring match, first entry wins. */
function matchEntry(stageNameLower: string) {
    for (const entry of stageRoleMap()) {
        if (entry.keywords.some(kw => stageNameLower.includes(kw))) {
            return entry;
        }
    }
    return null;
}

export function isStageLocked(item: Item, stageName: string, userRole: string): boolean {
    const role = userRole.toUpperCase();
    if (officeRoles().includes(role)) {
        return false;
    }

    const stageLower = stageName.toLowerCase();

    // Role-based permission mapping (server-owned config)
    const entry = matchEntry(stageLower);
    if (entry && !entry.roles.includes(role)) {
        return true;
    }

    // Check off-state configuration
    const originalStages = item.item_progresses
        .map(s => s.stage_name)
        .filter(name => !['QC', 'Delivery', 'Finance', 'Pengiriman'].includes(name) && !name.endsWith('REWORK'));

    const isVendorJob = originalStages.some(name => name.toLowerCase().includes('vendor'));

    if (isVendorJob) {
        if (['machining', 'fabrication', 'fabrikasi', 'cnc', 'qc', 'delivery', 'pengiriman', 'finance'].some(v => stageLower.includes(v))) {
            return true;
        }
    } else {
        if ((stageLower.includes('machining') || stageLower.includes('cnc')) && !originalStages.some(name => name.toLowerCase().includes('machining') || name.toLowerCase().includes('cnc'))) return true;
        if ((stageLower.includes('fabrication') || stageLower.includes('fabrikasi')) && !originalStages.some(name => name.toLowerCase().includes('fabrication') || name.toLowerCase().includes('fabrikasi'))) return true;
        if (stageLower.includes('vendor')) return true;

        // QC requires Machining & Fabrication COMPLETED first
        if (stageLower === 'qc' && !stageLower.includes('rework')) {
            const prodStages = item.item_progresses.filter(s =>
                (s.stage_name.toLowerCase().includes('machining') ||
                 s.stage_name.toLowerCase().includes('cnc') ||
                 s.stage_name.toLowerCase().includes('fabrication') ||
                 s.stage_name.toLowerCase().includes('fabrikasi')) &&
                !s.stage_name.toLowerCase().includes('rework')
            );
            if (prodStages.some(s => s.status !== 'COMPLETED')) return true;
        }

        if (stageLower === 'delivery' || stageLower === 'pengiriman') {
            const qcStage = item.item_progresses.find(s => s.stage_name === 'QC');
            if (!qcStage || (item.target_qty > 1 ? qcStage.completed_qty === 0 : parseFloat(qcStage.progress_percent) < 100)) return true;
        }

        if (stageLower === 'finance') {
            const deliveryStage = item.item_progresses.find(s => s.stage_name === 'Delivery' || s.stage_name === 'Pengiriman');
            if (!deliveryStage || (item.target_qty > 1 ? deliveryStage.completed_qty === 0 : parseFloat(deliveryStage.progress_percent) < 100)) return true;
        }
    }

    return false;
}

/**
 * @param t  Translation map for the current language (from useTranslation).
 */
export function getStageLockReason(
    item: Item,
    stageName: string,
    userRole: string,
    t: Record<string, any>
): string | null {
    const stageLower = stageName.toLowerCase();

    // First check role permission
    if (isStageLocked(item, stageName, userRole)) {
        const role = userRole.toUpperCase();
        if (!officeRoles().includes(role)) {
            const entry = matchEntry(stageLower);
            if (entry && !entry.roles.includes(role)) {
                return t.role_mismatch;
            }
        }

        // Off-state locks
        const originalStages = item.item_progresses
            .map(s => s.stage_name)
            .filter(name => !['QC', 'Delivery', 'Finance', 'Pengiriman'].includes(name) && !name.endsWith('REWORK'));
        const isVendorJob = originalStages.some(name => name.toLowerCase().includes('vendor'));

        if (isVendorJob) {
            if (['machining', 'fabrication', 'fabrikasi', 'cnc', 'qc', 'delivery', 'pengiriman', 'finance'].some(v => stageLower.includes(v))) {
                return t.off_state;
            }
        } else {
            if ((stageLower.includes('machining') || stageLower.includes('cnc')) && !originalStages.some(name => name.toLowerCase().includes('machining') || name.toLowerCase().includes('cnc'))) return t.off_state;
            if ((stageLower.includes('fabrication') || stageLower.includes('fabrikasi')) && !originalStages.some(name => name.toLowerCase().includes('fabrication') || name.toLowerCase().includes('fabrikasi'))) return t.off_state;
            if (stageLower.includes('vendor')) return t.off_state;

            if (stageLower === 'qc') {
                const prodStages = item.item_progresses.filter(s =>
                    (s.stage_name.toLowerCase().includes('machining') ||
                     s.stage_name.toLowerCase().includes('cnc') ||
                     s.stage_name.toLowerCase().includes('fabrication') ||
                     s.stage_name.toLowerCase().includes('fabrikasi')) &&
                    !s.stage_name.toLowerCase().includes('rework')
                );
                if (prodStages.some(s => s.status !== 'COMPLETED')) return t.locked_qc;
            }

            if (stageLower === 'delivery' || stageLower === 'pengiriman') {
                const qcStage = item.item_progresses.find(s => s.stage_name === 'QC');
                if (!qcStage || (item.target_qty > 1 ? qcStage.completed_qty === 0 : parseFloat(qcStage.progress_percent) < 100)) {
                    return t.locked_delivery;
                }
            }

            if (stageLower === 'finance') {
                const deliveryStage = item.item_progresses.find(s => s.stage_name === 'Delivery' || s.stage_name === 'Pengiriman');
                if (!deliveryStage || (item.target_qty > 1 ? deliveryStage.completed_qty === 0 : parseFloat(deliveryStage.progress_percent) < 100)) {
                    return t.locked_finance;
                }
            }
        }
    }
    return null;
}

/**
 * The single finance-stage derivation. Finance is a virtual stage computed
 * from server-owned item fields (payment_status + invoice_status).
 * Previously copy-pasted in 4 places across Worker/Dashboard.tsx + here.
 */
export function getFinanceStage(item: Item): Stage {
    const isComplete = item.payment_status === 'PAID' && item.invoice_status === 'INVOICED';

    return {
        id: -item.id,
        stage_name: 'Finance',
        completed_qty: 0,
        progress_percent: isComplete ? '100' : '0',
        status: isComplete ? 'COMPLETED' : 'PENDING',
    };
}

export function getAllStages(item: Item): Stage[] {
    const isVendor = item.item_progresses.some(s => s.stage_name === 'Vendor');

    const displayStages = [...item.item_progresses];
    if (!isVendor) {
        displayStages.push(getFinanceStage(item));
    }
    return displayStages;
}

export function getMatchingStages(item: Item, role: string): Stage[] {
    const roleUpper = role.toUpperCase();
    return getAllStages(item).filter(stage => {
        const nameLower = stage.stage_name.toLowerCase();
        const entry = matchEntry(nameLower);
        return entry !== null && entry.roles.includes(roleUpper);
    });
}

export function getMatchingStageOrMock(item: Item, role: string): Stage | null {
    const stages = getMatchingStages(item, role);
    return stages.length > 0 ? stages[0] : null;
}
