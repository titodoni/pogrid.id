export interface Tenant {
    id: number;
    slug: string;
    company_name: string;
    logo_path?: string | null;
    theme?: string;
    workflow_settings?: {
        workflow_mode?: 'strict' | 'loose' | 'custom';
        require_design_approved_for_production?: boolean;
        require_material_ready_for_production?: boolean;
        require_production_completed_for_qc?: boolean;
        require_qc_completed_for_delivery?: boolean;
        require_delivery_for_finance?: boolean;
    } | null;
    is_active?: boolean;
}

export interface User {
    id: number;
    name: string;
    username?: string | null;
    email?: string | null;
    role_name?: string;
    role_level?: string;
    post_name?: string | null;
    role_display_name?: string;
    role_display_name_id?: string | null;
    post_display_name?: string | null;
    post_display_name_id?: string | null;
    is_owner: boolean;
    tenant_id?: number;
}

export interface Stage {
    id: number;
    stage_name: string;
    completed_qty: number;
    progress_percent: string;
    status: string;
    previous_completed_qty?: number | null;
    previous_progress_percent?: string | null;
}

export interface DoItem {
    id: number;
    item_id: number;
    do_number: string;
    delivered_qty: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface DeliveryOrder {
    id: number;
    po_id: number;
    do_number: string;
    delivery_date: string;
    po?: Po;
    do_items?: DoItem[];
}

export interface Invoice {
    id: number;
    delivery_order_id: number | null;
    invoice_number: string;
    total_amount: string;
    status: string;
    due_date: string;
    invoice_type: string;
    delivery_order?: DeliveryOrder;
}

export interface Item {
    id: number;
    po_id: number;
    item_name: string;
    target_qty: number;
    item_type: string;
    progress_percent: string;
    status: string;
    purchasing_status?: string | null;
    drafter_status?: string | null;
    delivery_status?: string | null;
    invoice_status?: string | null;
    payment_status?: string | null;
    invoiced_qty?: number;
    item_progresses: Stage[];
    delivered_qty: number;
    po?: Po;
    vendor_name?: string | null;
    is_urgent: boolean;
    doItems?: DoItem[];
    created_at: string;
    updated_at: string;
}

export interface Po {
    id: number;
    po_number: string;
    external_po_number?: string | null;
    client_name: string;
    global_deadline: string;
    status: string;
    is_urgent?: boolean | null;
    items: Item[];
    created_at?: string;
    updated_at?: string;
}

export interface Alert {
    id: number;
    po_id?: number | null;
    item_id?: number | null;
    tenant_id?: number;
    severity: string;
    message: string;
    is_resolved: boolean;
    resolved_by?: number | null;
    resolved_at?: string | null;
    reason_type?: string | null;
    escalated_at?: string | null;
    created_at?: string;
    updated_at?: string;

    // Relations that might be loaded
    po?: Po;
    item?: Item;
}

export interface PageProps {
    auth?: {
        user: User;
    };
    tenant?: Tenant;
    flash?: {
        success?: string;
        error?: string;
        warning?: string;
        info?: string;
    };
    pusher_config?: {
        key: string;
        cluster: string;
    };
    lang?: 'en' | 'id';
}

// ─────────────────────────────────────────────────────────────
// Superpowers (platform admin panel) types
// ─────────────────────────────────────────────────────────────

/**
 * Astryx `Table` constrains its row generic to `Record<string, unknown>`.
 * Row shapes fed to `<Table data={...} />` must extend this so generic
 * inference keeps the concrete row type inside `renderCell`.
 */
export type TableRowShape = { [key: string]: unknown };

/** Laravel length-aware paginator payload as serialized by Inertia. */
export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}

export interface PlatformAdmin {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    has_two_factor: boolean;
}

export interface PlatformMaintenance {
    enabled: boolean;
    message: string | null;
}

/** Subscription status values treated as "active" by the backend. */
export type SubscriptionStatus =
    | 'ACTIVE'
    | 'PAID'
    | 'SUBSCRIBED'
    | 'READONLY'
    | string;

export interface PlanSummary {
    id: number;
    name: string;
    price_cents: number;
}

export interface TenantRow extends TableRowShape {
    id: number;
    company_name: string;
    slug: string;
    subscription_status: SubscriptionStatus;
    plan: PlanSummary | null;
    users_count: number;
    deleted_at: string | null;
    created_at: string | null;
}

export interface Plan {
    id: number;
    name: string;
    price: number;
}

export interface SuperpowersFlash {
    success?: string;
    error?: string;
    warning?: string;
    info?: string;
}

export interface SuperpowersPageProps {
    platformAdmin: PlatformAdmin | null;
    platform_maintenance: PlatformMaintenance | null;
    flash?: SuperpowersFlash;
    [key: string]: unknown;
}
