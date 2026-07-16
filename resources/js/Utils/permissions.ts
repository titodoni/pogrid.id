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

interface StageRoleEntry {
    keywords: string[];
    allowedRoles: string[];
    exact?: boolean;
}

export const STAGE_ROLE_MAP: StageRoleEntry[] = [
    { keywords: ['design', 'gambar', 'draft'], allowedRoles: ['DRAFTER'] },
    { keywords: ['material', 'bahan'], allowedRoles: ['PURCHASING'] },
    { keywords: ['machining', 'cnc'], allowedRoles: ['MACHINING', 'CNC', 'PRODUCTION'] },
    { keywords: ['fabrication', 'fabrikasi'], allowedRoles: ['FABRICATION', 'PRODUCTION'] },
    { keywords: ['vendor', 'purchasing'], allowedRoles: ['PURCHASING'] },
    { keywords: ['qc'], allowedRoles: ['QC'], exact: true },
    { keywords: ['delivery', 'pengiriman'], allowedRoles: ['DELIVERY'], exact: true },
    { keywords: ['finance'], allowedRoles: ['FINANCE'], exact: true },
];

export const OFFICE_ROLES = ['OWNER', 'ADMIN', 'SALES', 'MANAGER'];

function matchesStage(stageName: string, entry: StageRoleEntry): boolean {
    const lower = stageName.toLowerCase();
    if (entry.exact) {
        return entry.keywords.some(kw => lower === kw);
    }
    return entry.keywords.some(kw => lower.includes(kw));
}

export function isStageLocked(item: Item, stageName: string, userRole: string): boolean {
    const role = userRole.toUpperCase();
    if (OFFICE_ROLES.includes(role)) {
        return false;
    }

    const stageLower = stageName.toLowerCase();

    // Role-based permission mapping
    for (const entry of STAGE_ROLE_MAP) {
        if (matchesStage(stageLower, entry) && !entry.allowedRoles.includes(role)) {
            return true;
        }
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

export function getStageLockReason(
    item: Item,
    stageName: string,
    userRole: string,
    translations: Record<string, any>,
    lang: 'en' | 'id'
): string | null {
    const t = translations[lang];
    const stageLower = stageName.toLowerCase();

    // First check role permission
    if (isStageLocked(item, stageName, userRole)) {
        // Find if it's role mismatch
        const role = userRole.toUpperCase();
        if (!OFFICE_ROLES.includes(role)) {
            for (const entry of STAGE_ROLE_MAP) {
                if (matchesStage(stageLower, entry) && !entry.allowedRoles.includes(role)) {
                    return t.role_mismatch;
                }
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

export function getAllStages(item: Item): Stage[] {
    const isVendor = item.item_progresses.some(s => s.stage_name === 'Vendor');
    const isManufacture = !isVendor;

    const displayStages = [...item.item_progresses];
    if (isManufacture) {
        const isPaid = item.payment_status === 'PAID';
        const isInvoiced = item.invoice_status === 'INVOICED';
        const financeStatus = (isPaid && isInvoiced) ? 'COMPLETED' : 'PENDING';
        const financePercent = (isPaid && isInvoiced) ? '100' : '0';

        displayStages.push({
            id: -item.id,
            stage_name: 'Finance',
            completed_qty: 0,
            progress_percent: financePercent,
            status: financeStatus,
        });
    }
    return displayStages;
}

export function getMatchingStages(item: Item, role: string): Stage[] {
    const roleUpper = role.toUpperCase();
    return getAllStages(item).filter(stage => {
        const nameLower = stage.stage_name.toLowerCase();
        for (const entry of STAGE_ROLE_MAP) {
            if (entry.allowedRoles.includes(roleUpper) && matchesStage(nameLower, entry)) {
                return true;
            }
        }
        return false;
    });
}

export function getMatchingStageOrMock(item: Item, role: string): Stage | null {
    const stages = getMatchingStages(item, role);
    return stages.length > 0 ? stages[0] : null;
}
