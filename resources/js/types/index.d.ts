export interface Tenant {
    id: number;
    slug: string;
    company_name: string;
    is_active: boolean;
    tenant_config?: {
        brand_color?: string;
        logo_path?: string;
    } | null;
}

export interface User {
    id: number;
    username: string;
    name: string;
    email: string;
    role_name?: string;
    post_name?: string;
    role_level?: 'office' | 'floor';
    is_owner: boolean;
    tenant_id: number;
    status: string;
    pin_code?: string;
}

export interface Stage {
    id: number;
    stage_name: string;
    completed_qty: number;
    progress_percent: string;
    status: string;
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

export interface Item {
    id: number;
    po_id: number;
    item_name: string;
    target_qty: number;
    item_type: 'MANUFACTURE' | 'BUY_OUT' | 'SERVICE';
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
    vendor_name?: string | null;
    is_urgent: boolean;
    doItems?: DoItem[];
    created_at: string;
    updated_at: string;
}

export interface Po {
    id: number;
    po_number: string;
    client_name: string;
    global_deadline: string;
    status: string;
    is_urgent: boolean;
    items: Item[];
    created_at: string;
    updated_at: string;
}

export interface Alert {
    id: number;
    po_id?: number | null;
    item_id?: number | null;
    tenant_id: number;
    severity: 'RED' | 'YELLOW' | 'BLUE';
    message: string;
    is_resolved: boolean;
    resolved_by?: number | null;
    resolved_at?: string | null;
    reason_type?: string | null;
    created_at: string;
    updated_at: string;
    
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
