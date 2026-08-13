import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, Settings, Lock, Plus, Palette, Stop, Broadcast, Globe, Copy, DotGreen, Search } from '../../Components/Icons';
import { AppLayout } from '../../Components/AppLayout';
import { formatDeadline, calculateDeadlineDiff } from '../../Utils/deadline';
import { formatDDMMYYYY } from '../../Utils/date';
import { getWorkflowConfig } from '../../Utils/workflow';
import { useEchoPresence } from '../../Hooks/useEchoPresence';
import ProgressBar from '../../Components/ProgressBar';
import PillFilter from '../../Components/PillFilter';
import TeamTab from '../../features/owner/TeamTab';
import MatrixTab from '../../features/owner/MatrixTab';
import AlertsTab from '../../features/owner/AlertsTab';
import PoGridSection from '../../features/owner/PoGridSection';
import StageTemplateModal from '../../features/owner/StageTemplateModal';
import type { Stage, Item, Po, Alert, DoItem, DeliveryOrder, Invoice, User } from '../../types';
import { WarningPill } from '../../Components/WarningPill';
import { localizedDisplay } from '../../Utils/locale';
import { StatusBadge } from '../../Components/StatusBadge';
import PresentationMode from '../../Components/OwnerDashboard/PresentationMode';
import { DashboardMetrics } from '../../Components/OwnerDashboard/DashboardMetrics';
import SearchModal from '../../Components/OwnerDashboard/SearchModal';
import BroadcastToasts from '../../Components/BroadcastToasts';
import { CompanyBrandingSetup } from '../../Components/OwnerDashboard/CompanyBrandingSetup';
import { UserManagementModals } from '../../Components/OwnerDashboard/UserManagementModals';
import { useImperativeAlertDialog } from '@astryxdesign/core';
import echo from '../../bootstrap';
import ProductionPipeline from '../../Components/OwnerDashboard/ProductionPipeline';
import ActiveDelayDirectory from '../../Components/OwnerDashboard/ActiveDelayDirectory';
import { FinanceHealthStrip } from '../../Components/OwnerDashboard/FinanceHealthStrip';
import { ChartRow } from '../../Components/OwnerDashboard/ChartRow';
import { BottleneckDetailTable } from '../../Components/OwnerDashboard/BottleneckDetailTable';
import { ClientPerformanceBoard } from '../../Components/OwnerDashboard/ClientPerformanceBoard';
import { useTranslation } from "@/i18n/useTranslation";

const formatAlertTime = (dateStr: string, lang: 'en' | 'id') => {
    try {
        const date = new Date(dateStr);
        const day = date.getDate();
        const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthNamesId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const month = lang === 'en' ? monthNamesEn[date.getMonth()] : monthNamesId[date.getMonth()];
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        const today = new Date();
        const isToday = date.getDate() === today.getDate() &&
                        date.getMonth() === today.getMonth() &&
                        date.getFullYear() === today.getFullYear();
        
        if (isToday) {
            return lang === 'id' ? `Hari ini, ${hours}:${minutes}` : `Today, ${hours}:${minutes}`;
        }
        return `${day} ${month}, ${hours}:${minutes}`;
    } catch (e) {
        return '';
    }
};

const formatReasonType = (reason: string, lang: 'en' | 'id') => {
    if (!reason) return '';
    const clean = reason.trim();
    if (lang === 'id') {
        switch (clean.toLowerCase()) {
            case 'machine broken':
            case 'machine_broken':
                return 'Mesin Rusak';
            case 'material delay':
            case 'material_delay':
                return 'Bahan Baku Terlambat';
            case 'operator sick':
            case 'operator_sick':
                return 'Operator Sakit';
            case 'power outage':
            case 'power_outage':
                return 'Mati Listrik';
            case 'human error':
            case 'human_error':
                return 'Kesalahan Operator';
            case 'qc rework':
            case 'qc_rework':
                return 'Rework QC';
            case 'pin reset':
            case 'pin_reset':
                return 'Reset PIN';
            case 'other':
                return 'Lainnya';
            default:
                return reason;
        }
    }
    return reason;
};







const getItemStateColor = (deadlineDateStr: string | undefined, hasRework: boolean, itemStatus: string): { bg: string; border: string; glow: string } => {
    if (!deadlineDateStr) return { bg: 'transparent', border: 'transparent', glow: 'transparent' };
    if (itemStatus === 'TERMINATED' || itemStatus === 'CANCELLED') return { bg: 'rgba(239, 68, 68, 0.03)', border: 'rgba(239, 68, 68, 0.15)', glow: 'rgba(239, 68, 68, 0.06)' };
    
    // Check Rework first (takes precedence or is a high priority status)
    if (hasRework) {
        return { bg: 'rgba(249, 115, 22, 0.04)', border: 'rgba(249, 115, 22, 0.2)', glow: 'rgba(249, 115, 22, 0.08)' };
    }

    const deadline = new Date(deadlineDateStr);
    const deadlineClean = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    const today = new Date();
    const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = deadlineClean.getTime() - todayClean.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        // Red warning (delayed)
        return { bg: 'rgba(239, 68, 68, 0.04)', border: 'rgba(239, 68, 68, 0.2)', glow: 'rgba(239, 68, 68, 0.08)' };
    } else if (diffDays <= 3) {
        // Orange warning (deadline close)
        return { bg: 'rgba(249, 115, 22, 0.04)', border: 'rgba(249, 115, 22, 0.2)', glow: 'rgba(249, 115, 22, 0.08)' };
    }
    return { bg: 'transparent', border: 'transparent', glow: 'transparent' };
};





interface Props {
    pos: Po[];
    alerts: Alert[];
    users: User[];
    roles: Array<{ id: number; name: string; display_name: string; display_name_id?: string | null; level: string }>;
    posts: Array<{ id: number; name: string; display_name: string; display_name_id?: string | null }>;
    tenant?: {
        company_name: string;
        slug: string;
        logo_path?: string | null;
        theme?: string;
        workflow_settings?: {
            workflow_mode: 'strict' | 'loose' | 'custom';
            require_design_approved_for_production: boolean;
            require_material_ready_for_production: boolean;
            require_production_completed_for_qc: boolean;
            require_qc_completed_for_delivery: boolean;
            require_delivery_for_finance: boolean;
        } | null;
    };
    auth_user?: User;
    telemetry?: any;
    selected_range?: string;
}

export default function OwnerDashboard({ pos, alerts, users, roles, posts, tenant, auth_user, telemetry, selected_range }: Props) {
    const { t, language, changeLanguage } = useTranslation('Owner_Dashboard');
    const { errors } = usePage().props;
    // Server-owned business-rule configuration (config/workflow.php via Inertia)
    const workflow = getWorkflowConfig();

    const renderStatusBadge = (text: string, dotColor: string) => (
        <span className="badge animate-fade" style={{
            backgroundColor: 'var(--color-pg-surface)',
            color: 'var(--color-pg-text-secondary)',
            border: '1px solid var(--color-pg-border)',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            boxShadow: 'inset 0 1px 0 var(--color-pg-border)',
        }}>
            <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: dotColor,
                display: 'inline-block',
                boxShadow: dotColor !== 'var(--color-pg-text-muted)' ? `0 0 6px ${dotColor}` : 'none'
            }} />
            {text}
        </span>
    );
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedItemId, setCopiedItemId] = useState<number | null>(null);

    const [onboardingAdminName, setOnboardingAdminName] = useState('');
    const [onboardingAdminEmail, setOnboardingAdminEmail] = useState('');
    const [onboardingSuccessMessage, setOnboardingSuccessMessage] = useState('');
    const [onboardingErrorMessage, setOnboardingErrorMessage] = useState('');
    const [isOnboardingSubmitLoading, setIsOnboardingSubmitLoading] = useState(false);

    const getPieceLocations = (item: any) => {
        const stages = [...(item.item_progresses || [])];
        if (stages.length === 0) return [];
        
        // Filter out non-physical stages (Design/Gambar/Draft stages do not track physical pieces)
        const physicalStages = stages.filter((s: any) => {
            const name = s.stage_name.toLowerCase();
            return !name.includes('design') && !name.includes('gambar') && !name.includes('draft');
        });
        
        const locations = [];
        const target = item.target_qty || 0;
        const delivered = item.delivered_qty || 0;
        
        if (delivered > 0) {
            locations.push({
                stage_name: language === 'id' ? 'Terkirim' : 'Delivered',
                qty: delivered,
                color: 'var(--color-pg-success)',
                bg: 'rgba(16, 185, 129, 0.1)'
            });
        }
        
        // Find completed counts for physical stages.
        // Piece count in stage i = (completed in stage i) - (max completed in any stage > i)
        // Pieces not started = target - max completed in any physical stage
        const completedMap = physicalStages.map((s: any) => s.completed_qty || 0);
        const maxCompletedAnywhere = completedMap.length > 0 ? Math.max(...completedMap, delivered) : delivered;
        
        for (let i = physicalStages.length - 1; i >= 0; i--) {
            const currentStage = physicalStages[i];
            const currentCompleted = currentStage.completed_qty || 0;
            
            // Find max completed in any subsequent physical stage (indices > i) or delivered
            let maxSubsequent = delivered;
            for (let j = i + 1; j < physicalStages.length; j++) {
                if (physicalStages[j].completed_qty > maxSubsequent) {
                    maxSubsequent = physicalStages[j].completed_qty;
                }
            }
            
            // Deduct to find current pending count in this stage
            const qtyInCurrent = Math.max(0, currentCompleted - maxSubsequent);
            
            if (qtyInCurrent > 0) {
                // Determine stage color
                let color = '#3b82f6';
                let bg = 'rgba(59, 130, 246, 0.1)';
                if (currentStage.status === 'STUCK') {
                    color = '#ef4444';
                    bg = 'rgba(239, 68, 68, 0.1)';
                } else if (currentStage.stage_name.toLowerCase().includes('qc')) {
                    color = 'var(--color-pg-orange)';
                    bg = 'rgba(249, 115, 22, 0.1)';
                }
                
                locations.push({
                    stage_name: currentStage.stage_name,
                    qty: qtyInCurrent,
                    color,
                    bg
                });
            }
        }
        
        // Add "Queued" if there are pieces not started
        const queuedQty = target - maxCompletedAnywhere;
        if (queuedQty > 0) {
            locations.push({
                stage_name: language === 'id' ? 'Menunggu Produksi' : 'Queued/Pending',
                qty: queuedQty,
                color: 'var(--color-pg-text-muted)',
                bg: 'var(--color-pg-surface)'
            });
        }
        
        return locations;
    };

    const calculateDynamicETA = (item: any, telemetry: any, lang: 'en' | 'id') => {
        if (['COMPLETED', 'DELIVERED', 'CLOSED', 'CANCELLED', 'TERMINATED'].includes(item.status)) {
            return null;
        }
        
        const incompleteStages = (item.item_progresses || []).filter((s: any) => s.status !== 'COMPLETED');
        if (incompleteStages.length === 0) return null;
        
        const metrics = telemetry?.stage_metrics || [];
        let totalEstimatedDays = 0;
        
        incompleteStages.forEach((stage: any) => {
            const nameLower = stage.stage_name.toLowerCase();
            let targetCategory = '';
            if (nameLower.includes('design') || nameLower.includes('gambar') || nameLower.includes('draft')) {
                targetCategory = 'Drafter';
            } else if (nameLower.includes('material') || nameLower.includes('bahan') || nameLower.includes('purchasing') || nameLower.includes('vendor')) {
                targetCategory = 'Purchasing';
            } else if (nameLower.includes('qc')) {
                targetCategory = 'QC';
            } else if (nameLower.includes('delivery') || nameLower.includes('pengiriman') || nameLower.includes('finance') || nameLower.includes('billing')) {
                targetCategory = 'Finance';
            } else {
                targetCategory = 'Production';
            }
            
            const metric = metrics.find((m: any) => m.stage === targetCategory);
            const cycleTime = (metric && metric.avg_cycle_time > 0) ? metric.avg_cycle_time : 1.0;
            
            const progress = parseFloat(stage.progress_percent) || 0;
            const remainingFactor = Math.max(0, (100 - progress) / 100);
            
            totalEstimatedDays += cycleTime * remainingFactor;
        });
        
        if (totalEstimatedDays === 0) return null;
        
        const etaDate = new Date();
        etaDate.setTime(etaDate.getTime() + totalEstimatedDays * 24 * 60 * 60 * 1000);
        
        const day = etaDate.getDate();
        const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthNamesId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const month = lang === 'en' ? monthNamesEn[etaDate.getMonth()] : monthNamesId[etaDate.getMonth()];
        const hours = String(etaDate.getHours()).padStart(2, '0');
        const minutes = String(etaDate.getMinutes()).padStart(2, '0');
        
        const formattedDate = `${day} ${month} ${etaDate.getFullYear()}, ~${hours}:${minutes}`;
        const daysCeil = Math.ceil(totalEstimatedDays);
        const relativeText = lang === 'en' 
            ? `in ~${daysCeil} day${daysCeil > 1 ? 's' : ''}` 
            : `dalam ~${daysCeil} hari`;
            
        return {
            formattedDate,
            relativeText,
            totalEstimatedDays
        };
    };

    const copyItemStatusToClipboard = (item: any, po: any, lang: 'en' | 'id') => {
        const target = item.target_qty || 0;
        const delivered = item.delivered_qty || 0;
        const locations = getPieceLocations(item);
        const eta = calculateDynamicETA(item, telemetry, lang);
        
        let locationStr = '';
        if (locations && locations.length > 0) {
            locationStr = locations.map((loc: any) => `- ${loc.stage_name}: ${loc.qty} pcs`).join('\n');
        } else {
            locationStr = lang === 'en' ? '- Pending production' : '- Menunggu produksi';
        }
        
        let etaStr = '';
        if (['COMPLETED', 'DELIVERED', 'CLOSED'].includes(item.status)) {
            etaStr = lang === 'en' ? 'Completed & Fully Shipped' : 'Selesai & Dikirim Sepenuhnya';
        } else if (item.status === 'CANCELLED') {
            etaStr = lang === 'en' ? 'Cancelled' : 'Dibatalkan';
        } else if (item.status === 'TERMINATED') {
            etaStr = lang === 'en' ? 'Terminated Midway' : 'Dihentikan Tengah Jalan';
        } else if (eta) {
            etaStr = lang === 'en' 
                ? `Estimated Delivery: ${eta.formattedDate} (${eta.relativeText})` 
                : `Estimasi Pengiriman: ${eta.formattedDate} (${eta.relativeText})`;
        } else {
            etaStr = lang === 'en' ? 'TBD' : 'Menunggu Jadwal';
        }
        
        const text = lang === 'en' 
            ? `*Status Update: ${item.item_name}* (PO: ${po.po_number})
- Client: ${po.client_name}
- Total Quantity: ${target} pcs
- Shipped: ${delivered} pcs
- Current Piece Locations:
${locationStr}
- ${etaStr}` 
            : `*Pembaruan Status: ${item.item_name}* (PO: ${po.po_number})
- Klien: ${po.client_name}
- Total Jumlah: ${target} pcs
- Terkirim: ${delivered} pcs
- Lokasi Bagian Saat Ini:
${locationStr}
- ${etaStr}`;

        navigator.clipboard.writeText(text);
        setCopiedItemId(item.id);
        setTimeout(() => setCopiedItemId(null), 2000);
    };

    const [workflowMode, setWorkflowMode] = useState<'strict' | 'loose' | 'custom'>(() => {
        return tenant?.workflow_settings?.workflow_mode || 'loose';
    });
    const [reqDesign, setReqDesign] = useState<boolean>(() => {
        return tenant?.workflow_settings?.require_design_approved_for_production ?? false;
    });
    const [reqMaterial, setReqMaterial] = useState<boolean>(() => {
        return tenant?.workflow_settings?.require_material_ready_for_production ?? false;
    });
    const [reqProductionForQc, setReqProductionForQc] = useState<boolean>(() => {
        return tenant?.workflow_settings?.require_production_completed_for_qc ?? true;
    });
    const [reqQcForDelivery, setReqQcForDelivery] = useState<boolean>(() => {
        return tenant?.workflow_settings?.require_qc_completed_for_delivery ?? true;
    });
    const [reqDeliveryForFinance, setReqDeliveryForFinance] = useState<boolean>(() => {
        return tenant?.workflow_settings?.require_delivery_for_finance ?? true;
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const saveWorkflowSettings = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingSettings(true);
        router.post('/company/workflow-settings', {
            workflow_mode: workflowMode,
            require_design_approved_for_production: reqDesign,
            require_material_ready_for_production: reqMaterial,
            require_production_completed_for_qc: reqProductionForQc,
            require_qc_completed_for_delivery: reqQcForDelivery,
            require_delivery_for_finance: reqDeliveryForFinance,
        }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setIsSavingSettings(false),
        });
    };

    const handleSearchItemClick = (poId: number, itemId?: number) => {
        const targetPo = pos.find(p => p.id === poId);
        if (!targetPo) return;

        changeTab(targetPo.status === 'COMPLETED' ? 'completed' : 'active');

        setExpandedPOs(prev => {
            const next = new Set(prev);
            next.add(poId);
            return next;
        });

        if (itemId) {
            setExpandedItems(prev => {
                const next = new Set(prev);
                next.add(itemId);
                return next;
            });
        }

        setShowSearchModal(false);

        setTimeout(() => {
            const element = document.getElementById(`po-card-${poId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.style.transition = 'background-color 0.3s ease';
                element.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
                setTimeout(() => {
                    element.style.backgroundColor = '';
                }, 1200);
            }
        }, 150);
    };

    const handleSearchAlertClick = (alertId: string) => {
        changeTab('alerts');
        setShowSearchModal(false);

        setTimeout(() => {
            const element = document.getElementById(`alert-card-${alertId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.style.transition = 'background-color 0.3s ease';
                element.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                setTimeout(() => {
                    element.style.backgroundColor = '';
                }, 1200);
            }
        }, 150);
    };

    const getSearchResults = () => {
        if (!searchQuery.trim()) return { pos: [], items: [], clients: [], alerts: [] };

        const query = searchQuery.toLowerCase();
        const matchedPos: any[] = [];
        const matchedItems: any[] = [];
        const matchedClients = new Set<string>();
        const matchedAlerts: any[] = [];

        pos.forEach(po => {
            const poMatch = po.po_number.toLowerCase().includes(query) || 
                            (po.external_po_number && po.external_po_number.toLowerCase().includes(query));
            const clientMatch = po.client_name.toLowerCase().includes(query);

            if (poMatch || clientMatch) {
                matchedPos.push(po);
            }
            if (clientMatch) {
                matchedClients.add(po.client_name);
            }

            po.items.forEach(item => {
                const itemMatch = item.item_name.toLowerCase().includes(query) || 
                                  (item.item_type && item.item_type.toLowerCase().includes(query));
                if (itemMatch || poMatch || clientMatch) {
                    matchedItems.push({ ...item, po_id: po.id, po_number: po.po_number, client_name: po.client_name, po_status: po.status });
                }
            });
        });

        const unifiedIssues = getUnifiedIssuesList();
        unifiedIssues.forEach(issue => {
            const alertMatch = issue.message.toLowerCase().includes(query) || 
                               issue.title.toLowerCase().includes(query);
            if (alertMatch) {
                matchedAlerts.push(issue);
            }
        });

        return {
            pos: matchedPos,
            items: matchedItems,
            clients: Array.from(matchedClients),
            alerts: matchedAlerts
        };
    };

    const [activeTab, setActiveTab] = useState<'alerts' | 'active' | 'completed' | 'matrix' | 'team' | 'branding'>(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const tabParam = urlParams.get('tab');
            if (tabParam && ['alerts', 'active', 'completed', 'matrix', 'team', 'branding'].includes(tabParam)) {
                return tabParam as any;
            }
            const localSaved = localStorage.getItem('owner_active_tab');
            if (localSaved && ['alerts', 'active', 'completed', 'matrix', 'team', 'branding'].includes(localSaved)) {
                return localSaved as any;
            }
        }
        return 'alerts';
    });

    const changeTab = (tab: 'alerts' | 'active' | 'completed' | 'matrix' | 'team' | 'branding') => {
        setActiveTab(tab);
        if (typeof window !== 'undefined') {
            localStorage.setItem('owner_active_tab', tab);
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab);
            window.history.replaceState({}, '', url.toString());
        }
    };

    const [isPresentationMode, setIsPresentationMode] = useState(false);
    const [presentationSlide, setPresentationSlide] = useState(0);
    const [presentationAutoPlay, setPresentationAutoPlay] = useState(false);
    const [matrixFilter, setMatrixFilter] = useState<{ type: string; value: string; label: string } | null>(null);
    const [exportOpen, setExportOpen] = useState(false);
    const [dirCollapsed, setDirCollapsed] = useState(false);
    const [directoryFilter, setDirectoryFilter] = useState<'client' | 'marked' | 'delayed' | 'ontime' | 'close_due'>('client');
    const [activePoFilter, setActivePoFilter] = useState<'all' | 'marked' | 'delayed' | 'ontime' | 'close_due'>('all');

    const [currentTime, setCurrentTime] = useState(new Date());
    const [showOnlineUsersPopover, setShowOnlineUsersPopover] = useState(false);
    const reloadTimeoutRef = useRef<any>(null);

    const triggerScopedReload = useCallback((onlyKeys: string[] = ['pos', 'alerts', 'telemetry']) => {
        if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = setTimeout(() => {
            router.reload({
                only: onlyKeys as any,
            });
        }, 800);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        setMatrixFilter(null);
    }, [selected_range]);

    const { toastQueue, setToastQueue, onlineUsers, wsStatus } = useEchoPresence({
        tenantId: (tenant as any)?.id,
        channel: 'dashboard',
        onRefresh: () => router.reload({ only: ['pos', 'alerts', 'telemetry'] as any }),
        registerListeners: (channel, pushToast) => {
            channel.listen('.kendala.reported', (e: any) => {
                const alert = e.alert;
                pushToast({ message: alert?.message || '', severity: alert?.severity || 'RED', id: alert?.id || Date.now(), timestamp: Date.now() });
                router.reload({ only: ['alerts', 'pos', 'telemetry'] as any });
            });
            channel.listen('.alert.escalated', (e: any) => {
                const alert = e.alert;
                pushToast({ message: alert?.message || '', severity: 'ALERT', id: alert?.id || Date.now(), timestamp: Date.now() }, 12000);
                triggerScopedReload(['alerts', 'pos', 'telemetry']);
            });
            channel.listen('.production.terminated', () => {
                router.reload({ only: ['pos', 'alerts', 'telemetry'] as any });
            });
            channel.listen('.task.updated', (e: any) => {
                pushToast({ message: e.message || '', severity: 'INFO', id: Date.now(), timestamp: Date.now() });
                triggerScopedReload(['pos', 'alerts', 'telemetry']);
            });
            channel.listen('.qc.rework.logged', (e: any) => {
                const alert = e.alert;
                pushToast({ message: alert?.message || '', severity: 'REWORK', id: alert?.id || Date.now(), timestamp: Date.now() });
                triggerScopedReload(['alerts', 'pos', 'telemetry']);
            });
            channel.listen('.data.refreshed', () => {
                triggerScopedReload(['pos', 'alerts', 'telemetry']);
            });
        },
    });

    // Cleanup for the page-level debounced reload timer
    useEffect(() => () => {
        if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isPresentationMode) {
                togglePresentationMode();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPresentationMode]);

    useEffect(() => {
        if (!isPresentationMode || !presentationAutoPlay) return;
        const interval = setInterval(() => {
            setPresentationSlide(prev => (prev + 1) % 5);
        }, 10000);
        return () => clearInterval(interval);
    }, [isPresentationMode, presentationAutoPlay]);

    const togglePresentationMode = () => {
        setIsPresentationMode(prev => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                if (next) {
                    document.body.classList.add('presentation-mode');
                    setPresentationSlide(0);
                    setPresentationAutoPlay(false);
                } else {
                    document.body.classList.remove('presentation-mode');
                }
            }
            return next;
        });
    };

    const handleRangeChange = (newRange: string) => {
        router.get(window.location.pathname, { range: newRange, tab: activeTab }, { preserveState: true });
    };

    const getUnifiedIssuesList = () => {
        const issues: {
            id: string;
            po_id?: number;
            item_id?: number;
            severity: 'RED' | 'YELLOW' | 'BLUE' | 'ORANGE';
            type: 'DELAYED' | 'URGENT' | 'REWORK' | 'TROUBLE' | 'STUCK' | 'PIN_RESET' | 'OTHER';
            title: string;
            message: string;
            created_at?: string;
            escalated_at?: string | null;
            itemName?: string;
            poNumber?: string;
            stage?: string;
            note?: string;
            reason?: string;
            client_name?: string;
            action?: () => void;
        }[] = [];

        const today = new Date();
        const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // 1. Process active POs and items for delayed, close deadline
        pos.forEach(po => {
            if (po.status === 'COMPLETED') return;

            const deadline = new Date(po.global_deadline);
            const deadlineClean = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
            const diffTime = deadlineClean.getTime() - todayClean.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            po.items.forEach(item => {
                if (item.status === 'COMPLETED' || item.status === 'CANCELLED' || item.status === 'TERMINATED') return;

                // A. Check Delayed (deadline passed)
                if (diffDays < 0) {
                    issues.push({
                        id: `delayed-${item.id}`,
                        po_id: po.id,
                        item_id: item.id,
                        severity: 'RED',
                        type: 'DELAYED',
                        title: language === 'en' ? 'DELAYED' : 'TERLAMBAT',
                        message: language === 'en' 
                            ? `Item "${item.item_name}" for client "${po.client_name}" is delayed by ${Math.abs(diffDays)} day(s).`
                            : `Item "${item.item_name}" untuk klien "${po.client_name}" terlambat ${Math.abs(diffDays)} hari.`,
                    });
                }
                // B. Check Close Deadline — server deadline-risk rule
                // (config/workflow.php: days remaining <= risk_days AND progress < risk_progress)
                else if (diffDays <= workflow.deadline.risk_days && parseFloat(item.progress_percent) < workflow.deadline.risk_progress) {
                    const daysText = diffDays === 0 
                        ? (language === 'en' ? 'Today' : 'Hari Ini') 
                        : (language === 'en' ? `${diffDays} more day(s)` : `${diffDays} hari lagi`);
                    issues.push({
                        id: `close-${item.id}`,
                        po_id: po.id,
                        item_id: item.id,
                        severity: 'YELLOW',
                        type: 'URGENT',
                        title: language === 'en' ? 'DEADLINE CLOSE' : 'TENGGAT DEKAT',
                        message: language === 'en'
                            ? `Item "${item.item_name}" for client "${po.client_name}" is approaching deadline (${daysText}).`
                            : `Item "${item.item_name}" untuk klien "${po.client_name}" mendekati tenggat waktu (${daysText}).`,
                    });
                }
            });
        });

        // 2. Process database alerts
        alerts.forEach(alert => {
            const isPinReset = alert.message.startsWith('PIN Reset Requested');
            
            if (isPinReset) {
                issues.push({
                    id: `alert-pin-${alert.id}`,
                    severity: 'BLUE',
                    type: 'PIN_RESET',
                    title: language === 'en' ? 'PIN RESET REQUEST' : 'PERMINTAAN RESET PIN',
                    message: alert.message,
                    created_at: alert.created_at,
                    escalated_at: alert.escalated_at,
                    action: () => router.post(`/pin-reset/${alert.id}/approve`)
                });
            } else {
                const severity: 'RED' | 'YELLOW' | 'ORANGE' = alert.severity === 'RED' ? 'RED' : 'ORANGE';
                const type = alert.severity === 'RED' ? 'TROUBLE' : 'REWORK';
                const title = type === 'TROUBLE' 
                    ? (language === 'en' ? 'PRODUCTION TROUBLE' : 'KENDALA PRODUKSI')
                    : (language === 'en' ? 'QC REWORK ALERT' : 'PERINGATAN REWORK QC');

                // Custom parsed message logic to show exact trouble details
                let cleanMessage = alert.message;
                const itemName = alert.item?.item_name || 'Item';
                const poNumber = alert.item?.po?.po_number || '';
                const poInfo = poNumber ? `(PO: ${poNumber})` : '';

                if (type === 'REWORK') {
                    // Parse QC rework
                    const qtyMatch = alert.message.match(/QC Rework: (\d+)/);
                    const stageMatch = alert.message.match(/stage '([^']*)'/);
                    const qty = qtyMatch ? qtyMatch[1] : '';
                    const stage = stageMatch ? stageMatch[1] : '';
                    
                    if (language === 'id') {
                        cleanMessage = `${itemName} ${poInfo} — Rework QC: ${qty || 1} pcs ditolak di ${stage || 'QC'}`;
                    } else {
                        cleanMessage = `${itemName} ${poInfo} — QC Rework: ${qty || 1} pcs rejected on ${stage || 'QC'}`;
                    }

                    issues.push({
                        id: `alert-db-${alert.id}`,
                        po_id: alert.item?.po_id,
                        item_id: alert.item_id,
                        severity: severity,
                        type: type,
                        title: title,
                        message: cleanMessage,
                        created_at: alert.created_at,
                        escalated_at: alert.escalated_at,
                        itemName: itemName,
                        poNumber: poNumber,
                        stage: stage || 'QC',
                        reason: 'QC Rework',
                        note: qty ? `${qty} pcs` : '',
                        client_name: alert.item?.po?.client_name || '',
                    });
                } else {
                    // Parse Stuck/Trouble
                    const stageMatch = alert.message.match(/stage '([^']*)'/);
                    const noteMatch = alert.message.match(/\(Note: ([^\)]*)\)/);
                    const stage = stageMatch ? stageMatch[1] : '';
                    const note = noteMatch ? noteMatch[1] : '';
                    const reason = alert.reason_type || '';
                    const reasonDetail = note ? `${reason} (${note})` : reason;

                    if (language === 'id') {
                        cleanMessage = `${itemName} ${poInfo} — Terhambat di ${stage || 'Produksi'}: ${reasonDetail || 'Kendala'}`;
                    } else {
                        cleanMessage = `${itemName} ${poInfo} — Stuck on ${stage || 'Production'}: ${reasonDetail || 'Issue'}`;
                    }

                    issues.push({
                        id: `alert-db-${alert.id}`,
                        po_id: alert.item?.po_id,
                        item_id: alert.item_id,
                        severity: severity,
                        type: type,
                        title: title,
                        message: cleanMessage,
                        created_at: alert.created_at,
                        escalated_at: alert.escalated_at,
                        itemName: itemName,
                        poNumber: poNumber,
                        stage: stage || 'Production',
                        reason: reason,
                        note: note,
                        client_name: alert.item?.po?.client_name || '',
                    });
                }
            }
        });

        return issues;
    };
    const [expandedPOs, setExpandedPOs] = useState<Set<number>>(new Set());
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
    const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());

    const togglePO = (id: number) => {
        setExpandedPOs(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleItem = (id: number) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleItemSelection = (itemId: number) => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    const toggleSelectAll = (items: Item[]) => {
        if (selectedItemIds.size === items.length) {
            setSelectedItemIds(new Set());
        } else {
            setSelectedItemIds(new Set(items.map(i => i.id)));
        }
    };

    const filteredPos = (() => {
        const basePos = pos.filter(po => {
            if (activeTab === 'active') return po.status !== 'COMPLETED' && po.status !== 'DELIVERED' && po.status !== 'CLOSED';
            if (activeTab === 'completed') return po.status === 'COMPLETED' || po.status === 'DELIVERED' || po.status === 'CLOSED';
            return true;
        });

        if (activeTab !== 'active' || activePoFilter === 'all') {
            return basePos;
        }

        const result: typeof pos = [];
        basePos.forEach(po => {
            const matchedItems = po.items.filter(item => {
                switch (activePoFilter) {
                    case 'marked': {
                        const itemAlerts = alerts.filter(a => a.item_id === item.id && !a.is_resolved);
                        return itemAlerts.some(a => a.severity === 'RED' || a.severity === 'YELLOW');
                    }
                    case 'delayed': {
                        if (item.status === 'COMPLETED') return false;
                        const { diffDays } = calculateDeadlineDiff(po.global_deadline);
                        return diffDays < 0;
                    }
                    case 'ontime': {
                        if (item.status === 'COMPLETED') return true;
                        const { diffDays } = calculateDeadlineDiff(po.global_deadline);
                        return diffDays >= 0;
                    }
                    case 'close_due': {
                        if (item.status === 'COMPLETED') return false;
                        const { diffDays } = calculateDeadlineDiff(po.global_deadline);
                        return diffDays >= 0 && diffDays <= 3;
                    }
                    default:
                        return true;
                }
            });

            if (matchedItems.length > 0) {
                result.push({
                    ...po,
                    items: matchedItems
                });
            }
        });

        return result;
    })();

    useEffect(() => {
        if (activePoFilter !== 'all') {
            const matchingPoIds = filteredPos.map(po => po.id);
            setExpandedPOs(prev => {
                const next = new Set(prev);
                matchingPoIds.forEach(id => next.add(id));
                return next;
            });
        }
    }, [activePoFilter]);


    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);

    const changeTheme = (newTheme: string) => {
        localStorage.setItem('pogrid_theme', newTheme);
        const classes = ['theme-default', 'theme-linear', 'theme-vercel', 'theme-stripe', 'theme-github', 'theme-nordic', 'theme-light', 'theme-brand'];
        classes.forEach(c => document.documentElement.classList.remove(c));
        document.documentElement.classList.add(newTheme);
        setShowThemeDropdown(false);
    };

    const confirmAlert = useImperativeAlertDialog();

    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [adminName, setAdminName] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminPasswordConfirmation, setAdminPasswordConfirmation] = useState('');
    const [adminRoleId, setAdminRoleId] = useState<number | undefined>(undefined);
    const [adminPostId, setAdminPostId] = useState<number | undefined>(undefined);
    const [adminSubmitting, setAdminSubmitting] = useState(false);

    // Add User modal
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserRoleId, setNewUserRoleId] = useState<number | undefined>(undefined);
    const [newUserPostId, setNewUserPostId] = useState<string>('');
    const [newUserLoginMethod, setNewUserLoginMethod] = useState<'PASSWORD' | 'PIN'>('PIN');
    const [newUserUsername, setNewUserUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserPasswordConfirmation, setNewUserPasswordConfirmation] = useState('');
    const [newUserPin, setNewUserPin] = useState('');
    // ── User Management (Task 1) ──────────────────────────────────────────────
    const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // ── Stage Templates ────────────────────────────────────────────────────────
    const [stageTemplates, setStageTemplates] = useState<{ id: number; name: string; description: string | null; stages: string[] }[]>([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<{ id: number; name: string; description: string | null; stages: string[] } | null>(null);
    const [templateFormName, setTemplateFormName] = useState('');
    const [templateFormDesc, setTemplateFormDesc] = useState('');
    const [templateFormStages, setTemplateFormStages] = useState<string[]>([]);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);

    const ALL_STAGES_TEMPLATE = ['Design', 'Material', 'Machining', 'Fabrication', 'Assembly', 'Surface Treatment', 'QC', 'Delivery', 'Vendor'];

    useEffect(() => {
        fetch('/stage-templates')
            .then(res => res.json())
            .then(data => {
                if (data.templates) setStageTemplates(data.templates);
            })
            .catch(() => {});
    }, []);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('');
    const [editPostId, setEditPostId] = useState<string>('');
    const [editLoginMethod, setEditLoginMethod] = useState<'PASSWORD' | 'PIN'>('PIN');
    const [editUsername, setEditUsername] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editPin, setEditPin] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);

    const openEditUser = (user: User) => {
        setEditingUser(user);
        setEditName(user.name);
        const userRole = (roles ?? []).find(r => r.name === user.role_name);
        setEditRole(userRole ? String(userRole.id) : '');
        setEditPostId(user.post_name || '');
        const method = user.role_level === 'office' ? 'PASSWORD' : 'PIN';
        setEditLoginMethod(method);
        setEditUsername(user.username || '');
        setEditPassword('');
        setEditPin('');
        setEditSubmitting(false);
    };

    const closeEditUser = () => {
        setEditingUser(null);
        setEditSubmitting(false);
    };

    const submitEditUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser || editSubmitting) return;
        setEditSubmitting(true);
        router.post(`/users/${editingUser.id}/update`, {
            name: editName,
            role_id: parseInt(editRole),
            post_id: editPostId || null,
            login_method: editLoginMethod,
            username: editLoginMethod === 'PASSWORD' ? editUsername : null,
            password: editLoginMethod === 'PASSWORD' && editPassword ? editPassword : undefined,
            pin: editLoginMethod === 'PIN' && editPin ? editPin : undefined,
        }, {
            onSuccess: () => {
                closeEditUser();
                setEditSubmitting(false);
            },
            onError: () => setEditSubmitting(false),
        });
    };

    const handleDeleteUser = (user: User) => {
        confirmAlert.show({
            title: language === 'en' ? 'Delete User' : 'Hapus Pengguna',
            description: t.delete_user_confirm,
            actionLabel: t.delete_user,
            onAction: () => {
                router.post(`/users/${user.id}/delete`, {}, {
                    onSuccess: () => { closeEditUser(); confirmAlert.hide(); },
                    onError: () => confirmAlert.hide(),
                });
            },
            cancelLabel: t.cancel,
        });
    };
    // ─────────────────────────────────────────────────────────────────────────
    const openAddAdmin = () => {
        setAdminName('');
        setAdminUsername('');
        setAdminPassword('');
        setAdminPasswordConfirmation('');
        setAdminRoleId((roles ?? []).find(r => r.name === 'STAFF')?.id);
        setAdminPostId((posts ?? []).find(p => p.name === 'Admin')?.id);
        setShowSettingsDropdown(false);
        setShowAddAdminModal(true);
    };

    const submitAddAdmin = (e: React.FormEvent) => {
        e.preventDefault();
        if (adminSubmitting) return;
        setAdminSubmitting(true);
        router.post('/users', {
            name: adminName,
            role_id: adminRoleId,
            post_id: adminPostId,
            login_method: 'PASSWORD',
            username: adminUsername,
            password: adminPassword,
            password_confirmation: adminPasswordConfirmation,
        }, {
            onSuccess: () => {
                setShowAddAdminModal(false);
                setAdminSubmitting(false);
            },
            onError: () => setAdminSubmitting(false),
        });
    };
    const openAddUser = () => {
        setNewUserName('');
        setNewUserRoleId((roles ?? [])[0]?.id);
        setNewUserPostId('');
        setNewUserLoginMethod('PIN');
        setNewUserUsername('');
        setNewUserPassword('');
        setNewUserPasswordConfirmation('');
        setNewUserPin('');
        setShowAddUserModal(true);
    };

    const [addUserSubmitting, setAddUserSubmitting] = useState(false);

    const submitAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (addUserSubmitting) return;
        setAddUserSubmitting(true);
        router.post('/users', {
            name: newUserName,
            role_id: newUserRoleId,
            post_id: newUserPostId || null,
            login_method: newUserLoginMethod,
            username: newUserLoginMethod === 'PASSWORD' ? newUserUsername : null,
            password: newUserLoginMethod === 'PASSWORD' && newUserPassword ? newUserPassword : undefined,
            password_confirmation: newUserLoginMethod === 'PASSWORD' && newUserPasswordConfirmation ? newUserPasswordConfirmation : undefined,
            pin: newUserLoginMethod === 'PIN' && newUserPin ? newUserPin : undefined,
        }, {
            onSuccess: () => {
                setShowAddUserModal(false);
                setNewUserName('');
                setNewUserRoleId(undefined);
                setNewUserPostId('');
                setNewUserUsername('');
                setNewUserPassword('');
                setNewUserPasswordConfirmation('');
                setNewUserPin('');
                setAddUserSubmitting(false);
            },
            onError: () => setAddUserSubmitting(false),
        });
    };

    // No client/PO creation state â€” moved to dedicated page at /pos/create

    const handleCancel = (itemId: number) => {
        confirmAlert.show({
            title: language === 'en' ? 'Cancel Item' : 'Batalkan Item',
            description: t.cancel_item_confirm,
            actionLabel: language === 'en' ? 'Cancel' : 'Batalkan',
            onAction: () => {
                router.post(`/items/${itemId}/cancel`);
                confirmAlert.hide();
            },
            cancelLabel: t.cancel,
        });
    };

    const handleTerminate = (itemId: number) => {
        confirmAlert.show({
            title: language === 'en' ? 'Terminate Production' : 'Hentikan Produksi',
            description: t.terminate_item_confirm,
            actionLabel: language === 'en' ? 'Terminate' : 'Hentikan',
            actionVariant: 'destructive',
            onAction: () => {
                router.post(`/items/${itemId}/terminate`);
                confirmAlert.hide();
            },
            cancelLabel: t.cancel,
        });
    };

    const handleOnboardingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsOnboardingSubmitLoading(true);
        setOnboardingSuccessMessage('');
        setOnboardingErrorMessage('');

        router.post('/users/onboarding-create', {
            name: onboardingAdminName,
            email: onboardingAdminEmail,
        }, {
            onSuccess: (page) => {
                setIsOnboardingSubmitLoading(false);
                const successMsg = (page.props.flash as any)?.success || 'Admin user created successfully.';
                setOnboardingSuccessMessage(successMsg);
                setOnboardingAdminName('');
                setOnboardingAdminEmail('');
            },
            onError: (errs) => {
                setIsOnboardingSubmitLoading(false);
                if (errs.email) {
                    setOnboardingErrorMessage(errs.email);
                } else if (errs.name) {
                    setOnboardingErrorMessage(errs.name);
                } else {
                    setOnboardingErrorMessage(language === 'en' ? 'An error occurred while creating the admin user.' : 'Terjadi kesalahan saat membuat user admin.');
                }
            }
        });
    };

    const hasAdmins = users.some(u => u.role_name === 'STAFF');

    const renderOnboardingBanner = () => {
        if (!isOwner || hasAdmins) return null;

        return (
            <div style={{
                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)',
                border: '1px dashed rgba(99, 102, 241, 0.3)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.05)',
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '150px',
                    height: '150px',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{
                        flexShrink: 0,
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(99, 102, 241, 0.12)',
                        color: 'var(--color-pg-primary)',
                        display: 'grid',
                        placeItems: 'center',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>

                    <div style={{ flex: '1 1 300px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: '#fff' }}>
                            {language === 'en' ? 'Onboarding: Register Your First Admin' : 'Onboarding: Daftarkan Admin Pertama Anda'}
                        </h3>
                        <p style={{ fontSize: '13.5px', color: 'var(--color-pg-text-secondary)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                            {language === 'en' 
                                ? 'As the Owner, you cannot create POs directly. You must register at least one Admin user to manage POs and production. We will email them a temporary password.'
                                : 'Sebagai Owner, Anda tidak dapat membuat PO secara langsung. Anda harus mendaftarkan setidaknya satu user Admin untuk membuat PO dan mengelola produksi. Kami akan mengirimkan password sementara ke email mereka.'}
                        </p>

                        <form onSubmit={handleOnboardingSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
                                <input
                                    type="text"
                                    placeholder={language === 'en' ? "Admin Name" : "Nama Admin"}
                                    value={onboardingAdminName}
                                    onChange={e => setOnboardingAdminName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--color-pg-bg)',
                                        border: '1px solid var(--color-pg-border)',
                                        color: '#fff',
                                        fontSize: '13px',
                                        outline: 'none',
                                    }}
                                    required
                                />
                            </div>
                            <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
                                <input
                                    type="email"
                                    placeholder="admin@email.com"
                                    value={onboardingAdminEmail}
                                    onChange={e => setOnboardingAdminEmail(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--color-pg-bg)',
                                        border: '1px solid var(--color-pg-border)',
                                        color: '#fff',
                                        fontSize: '13px',
                                        outline: 'none',
                                    }}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isOnboardingSubmitLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--color-pg-primary)',
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: isOnboardingSubmitLoading ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 12px var(--color-pg-primary-glow)',
                                }}
                            >
                                {isOnboardingSubmitLoading 
                                    ? (language === 'en' ? 'Registering...' : 'Mendaftarkan...') 
                                    : (language === 'en' ? 'Register Admin' : 'Daftarkan Admin')}
                            </button>
                        </form>

                        {onboardingErrorMessage && (
                            <div style={{ color: 'var(--color-pg-error)', fontSize: '12px', marginTop: '8px', fontWeight: 500 }}>
                                ⚠️ {onboardingErrorMessage}
                            </div>
                        )}

                        {onboardingSuccessMessage && (
                            <div style={{ color: 'var(--color-pg-success)', fontSize: '12px', marginTop: '8px', fontWeight: 600 }}>
                                ✓ {onboardingSuccessMessage}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const isOwner = auth_user?.is_owner === true;
    const canBroadcastPo = auth_user?.is_owner !== true;

    if (isPresentationMode && telemetry) {
        return (
            <PresentationMode
                telemetry={telemetry}
                selected_range={selected_range}
                language={language}
                t={t}
                currentTime={currentTime}
                presentationSlide={presentationSlide}
                presentationAutoPlay={presentationAutoPlay}
                togglePresentationMode={togglePresentationMode}
                setPresentationSlide={setPresentationSlide}
                setPresentationAutoPlay={setPresentationAutoPlay}
                changeTab={changeTab}
                pos={pos}
                tenant={tenant}
            />
        );
    }

    const activeNav = activeTab === 'completed' ? 'archive' : activeTab === 'team' ? 'profile' : 'dashboard';

    return (
        <AppLayout activeNav={activeNav} onSearchClick={() => setShowSearchModal(true)}>
            <div className="dashboard-root px-3 sm:px-6 py-4">
            <BroadcastToasts
                toasts={toastQueue}
                language={language}
                onDismiss={(timestamp) => setToastQueue((prev) => prev.filter((x) => x.timestamp !== timestamp))}
            />
            <div className="dashboard-above-scroll">
                <div className="flex items-center justify-between gap-4 py-2 border-b border-[var(--color-pg-border)] mb-4 flex-wrap">
                    <div className="owner-header-title" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {tenant?.logo_path && (
                            <img src={tenant.logo_path} alt={`${tenant.company_name} Logo`} style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
                        )}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                    {tenant?.company_name ? `${tenant.company_name} · ${t.owner_command_center}` : t.owner_command_center}
                                </h1>
                                <span className="owner-header-datetime" style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)' }}>
                                    {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    {' · '}
                                    {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="owner-greeting" style={{ fontSize: '11px', color: 'var(--color-pg-primary-hover)', fontWeight: 600, marginTop: '1px' }}>
                                {language === 'en' ? `Hello, ${auth_user?.name}` : `Halo, ${auth_user?.name}`}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }} className="owner-header-actions">
                    {canBroadcastPo && (
                        <button
                            className="new-po-btn animate-pulse"
                            onClick={() => router.get('/pos/create')}
                            style={{
                                padding: '8px 16px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                color: '#fff',
                                fontWeight: 800,
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.45)',
                                transition: 'all 0.2s',
                                zIndex: 10,
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'; e.currentTarget.style.transform = 'none'; }}
                            title="Buat PO Baru / Broadcast New PO"
                        >
                            <Broadcast size={16} /> {t.broadcast_new_po}
                        </button>
                    )}
                    {/* Search Modal Button */}
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setShowSearchModal(true);
                        }}
                        style={{
                            padding: '8px',
                            backgroundColor: 'var(--color-pg-border-subtle)',
                            color: 'var(--color-pg-text-secondary)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            lineHeight: '1',
                            display: 'flex',
                        }}
                        title={language === 'en' ? 'Search POs, Items, Clients...' : 'Cari PO, Barang, Klien...'}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-pg-primary-glow)';
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                            e.currentTarget.style.color = 'var(--color-pg-primary-hover)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-pg-border-subtle)';
                            e.currentTarget.style.borderColor = 'var(--color-pg-border)';
                            e.currentTarget.style.color = 'var(--color-pg-text-secondary)';
                        }}
                    >
                        <Search size={16} />
                    </button>
                    {/* Theme Picker */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                            style={{
                                padding: '8px',
                                backgroundColor: 'var(--color-pg-border-subtle)',
                                color: 'var(--color-pg-text-secondary)',
                                border: '1px solid var(--color-pg-border)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                lineHeight: '1',
                                display: 'flex',
                            }}
                            title={language === 'en' ? 'Switch Theme' : 'Ganti Tema'}
                        >
                            <Palette size={16} />
                        </button>
                        {showThemeDropdown && (
                            <div style={{
                                position: 'absolute',
                                top: '40px',
                                right: '0',
                                width: '160px',
                                backgroundColor: 'var(--color-pg-card)',
                                border: '1px solid var(--color-pg-border)',
                                borderRadius: '10px',
                                padding: '6px',
                                zIndex: 100,
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                                display: 'grid',
                                gap: '4px',
                            }}>
                                {[
                                    { id: 'theme-default', name: 'Titanium Slate (Dark)', color: 'var(--color-pg-primary)' },
                                    { id: 'theme-light', name: 'Mint Cream (Light)', color: '#f4fff8' },
                                    { id: 'theme-linear', name: 'Obsidian Graphite', color: 'var(--color-pg-primary)' },
                                    { id: 'theme-vercel', name: 'Monochrome Void', color: 'var(--color-pg-primary)' },
                                    { id: 'theme-stripe', name: 'Stripe Navy', color: 'var(--color-pg-primary)' },
                                    { id: 'theme-github', name: 'GitHub Slate', color: 'var(--color-pg-primary)' },
                                    { id: 'theme-nordic', name: 'Nordic Polar', color: 'var(--color-pg-primary)' },
                                ].map((tOption) => (
                                    <button
                                        key={tOption.id}
                                        onClick={() => changeTheme(tOption.id)}
                                        style={{
                                            padding: '6px 8px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: 'var(--color-pg-text)',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--color-pg-card-hover)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: tOption.color }} />
                                        {tOption.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Profile - visible to all roles */}
                    <Link
                        href={'/c/' + (tenant?.slug || '') + '/profile'}
                        onClick={() => setShowSettingsDropdown(false)}
                        style={{
                            padding: '8px',
                            backgroundColor: 'var(--color-pg-border-subtle)',
                            color: 'var(--color-pg-text-secondary)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            lineHeight: '1',
                            display: 'flex',
                            textDecoration: 'none',
                        }}
                        title={language === 'en' ? 'Profile' : 'Profil'}
                    >
                        <Settings size={16} />
                    </Link>

                    {isOwner && (
                        <button
                            onClick={openAddAdmin}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'var(--color-pg-border-subtle)',
                                color: 'var(--color-pg-text-secondary)',
                                border: '1px solid var(--color-pg-border)',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <Plus size={14} /> {t.add_admin}
                        </button>
                    )}

                    <button
                        onClick={() => router.post('/logout')}
                        style={{
                            padding: '8px 14px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {language === 'en' ? 'Exit' : 'Keluar'}
                    </button>
                </div>
            </div>

            <div style={{ padding: '0 16px 6px' }}>
            {/* Error Messages */}
            {errors && Object.keys(errors).length > 0 && (
                <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                    color: '#ef4444'
                }}>
                    <h4 style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Validation Error</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {Object.entries(errors).map(([key, val]) => (
                            <li key={key}>{val as string}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Floor Terminal URL — compact chip */}
            {tenant && (
                <div className="floor-terminal-row" style={{
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: 'var(--color-pg-text-secondary)',
                    flexWrap: 'nowrap',
                    minWidth: 0,
                }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-pg-primary-hover)' }}>{t.floor_terminal_url}</span>
                    <code className="floor-terminal-chip" style={{
                        backgroundColor: 'rgba(37,99,235,0.08)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid rgba(37,99,235,0.15)',
                        color: '#a5b4fc',
                        fontSize: '11px',
                        fontWeight: 600,
                    }}>
                        {typeof window !== 'undefined' ? `${window.location.origin}/c/${tenant.slug}` : `/c/${tenant.slug}`}
                    </code>
                    <button
                        className="floor-terminal-copy-btn"
                        onClick={() => {
                            const url = typeof window !== 'undefined' ? `${window.location.origin}/c/${tenant.slug}` : `/c/${tenant.slug}`;
                            navigator.clipboard.writeText(url);
                            alert('URL copied!');
                        }}
                        style={{
                            padding: '1px 6px',
                            backgroundColor: 'rgba(37,99,235,0.15)',
                            color: 'var(--color-pg-primary-hover)',
                            fontWeight: 600,
                            border: '1px solid rgba(37,99,235,0.2)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            lineHeight: '20px',
                        }}
                    >
                        Copy
                    </button>

                    {/* Online Users & Connection Status Badge */}
                    <div style={{ position: 'relative', display: 'inline-block', marginLeft: 'auto' }}>
                        <button
                            onClick={() => setShowOnlineUsersPopover(prev => !prev)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: wsStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                border: `1px solid ${wsStatus === 'connected' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                                color: wsStatus === 'connected' ? '#10b981' : '#f59e0b',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                            title={language === 'en' ? 'Click to see online team members' : 'Klik untuk melihat anggota tim yang online'}
                        >
                            <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: wsStatus === 'connected' ? '#10b981' : '#f59e0b',
                                boxShadow: wsStatus === 'connected' ? '0 0 6px #10b981' : 'none'
                            }} />
                            <span>{onlineUsers.length} {language === 'en' ? 'Online' : 'Online'}</span>
                        </button>

                        {showOnlineUsersPopover && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '6px',
                                backgroundColor: 'var(--color-pg-card-bg)',
                                border: '1px solid var(--color-pg-border)',
                                borderRadius: '8px',
                                padding: '10px 14px',
                                zIndex: 1000,
                                minWidth: '220px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-pg-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {language === 'en' ? 'Active Team Members' : 'Tim yang Sedang Online'} ({onlineUsers.length})
                                </div>
                                {onlineUsers.length === 0 ? (
                                    <div style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)' }}>
                                        {language === 'en' ? 'No active users detected' : 'Belum ada pengguna lain'}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                                        {onlineUsers.map(u => (
                                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--color-pg-text)' }}>{u.name}</span>
                                                <span style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', backgroundColor: 'var(--color-pg-surface)', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {u.post_name || u.role}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Connection Disconnected Warning Banner */}
            {wsStatus === 'disconnected' && (
                <div style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    marginBottom: '12px',
                    fontSize: '12px',
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                }}>
                    <span>⚠️</span>
                    <span>{language === 'en' ? 'Connection lost — data may be stale. Retrying...' : 'Koneksi terputus — data mungkin tidak terbaru (mencoba ulang...)'}</span>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="tab-bar">
                <button className={`tab ${activeTab === 'alerts' ? 'tab-active' : ''}`} onClick={() => changeTab('alerts')}>
                    <span className="tab-label-full">{t.unresolved_alerts}</span>
                    <span className="tab-label-short">{t.tab_alerts}</span>
                    {alerts.length > 0 && (
                        <span style={{
                            marginLeft: '4px',
                            fontSize: '10px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            padding: '1px 5px',
                            borderRadius: '8px'
                        }}>
                            {alerts.length}
                        </span>
                    )}
                </button>
                <button className={`tab ${activeTab === 'active' ? 'tab-active' : ''}`} onClick={() => changeTab('active')}>
                    <span className="tab-label-full">Active POs</span>
                    <span className="tab-label-short">{t.tab_active}</span>
                </button>
                <button className={`tab ${activeTab === 'completed' ? 'tab-active' : ''}`} onClick={() => changeTab('completed')}>
                    <span className="tab-label-full">Completed</span>
                    <span className="tab-label-short">{t.tab_completed}</span>
                </button>
                <button className={`tab ${activeTab === 'matrix' ? 'tab-active' : ''}`} onClick={() => changeTab('matrix')}>
                    <span className="tab-label-full">{t.performance_matrix}</span>
                    <span className="tab-label-short">{t.tab_matrix}</span>
                </button>
                {(!auth_user?.role_name || (!auth_user.role_name.toLowerCase().includes('manager') && !auth_user.role_name.toLowerCase().includes('sales'))) && (
                    <button className={`tab ${activeTab === 'branding' ? 'tab-active' : ''}`} onClick={() => changeTab('branding')}>
                        <span className="tab-label-full">{language === 'id' ? 'Branding & Logo' : 'Branding & Logo'}</span>
                        <span className="tab-label-short">Branding</span>
                    </button>
                )}
            </div>

            {/* Removed State Summary Bar from sticky header */}
            </div>
            </div>

            <div className="dashboard-scroll" style={{ padding: '16px' }}>
                {renderOnboardingBanner()}
                {/* Premium Card Summary Section based on prior web app layout */}
                {(activeTab === 'alerts' || activeTab === 'active' || activeTab === 'completed') && (() => {
                    const activePOs = pos.filter(po => po.status !== 'COMPLETED' && po.status !== 'DELIVERED' && po.status !== 'CLOSED');
                    const overduePOs = activePOs.filter(po => {
                        const { diffDays } = calculateDeadlineDiff(po.global_deadline);
                        return diffDays < 0;
                    });
                    const overdueCount = overduePOs.length;

                    const nearDeadlinePOs = activePOs.filter(po => {
                        const { diffDays } = calculateDeadlineDiff(po.global_deadline);
                        return diffDays >= 0 && diffDays <= 3;
                    });
                    const nearDeadlineCount = nearDeadlinePOs.length;

                    const openTroublesCount = alerts.length;

                    const completedPOs = pos.filter(po => po.status === 'COMPLETED' || po.status === 'DELIVERED' || po.status === 'CLOSED');
                    const completedInRange = completedPOs.filter(po => {
                        if (!po.updated_at) return false;
                        const compDate = new Date(po.updated_at);
                        const today = new Date();
                        if (selected_range === 'week') {
                            const sevenDaysAgo = new Date();
                            sevenDaysAgo.setDate(today.getDate() - 7);
                            return compDate >= sevenDaysAgo;
                        } else if (selected_range === 'year') {
                            return compDate.getFullYear() === today.getFullYear();
                        } else { // month
                            return compDate.getMonth() === today.getMonth() && compDate.getFullYear() === today.getFullYear();
                        }
                    });
                    const completedCount = completedInRange.length;

                    const avgDelayDays = overdueCount > 0 
                        ? Math.round(overduePOs.reduce((sum, po) => sum + Math.abs(calculateDeadlineDiff(po.global_deadline).diffDays), 0) / overdueCount) 
                        : 0;

                    const worstDelayDays = overdueCount > 0 
                        ? Math.max(...overduePOs.map(po => Math.abs(calculateDeadlineDiff(po.global_deadline).diffDays))) 
                        : 0;

                    const prev = (telemetry?.previous || {}) as any;
                    const otdrDelta: number | null = (telemetry && telemetry.otdr != null && prev?.otdr != null)
                        ? Math.round((telemetry.otdr - prev.otdr) * 10) / 10
                        : null;

                    const renderSummaryCard = (
                        title: string,
                        value: number | string,
                        subtitle: string,
                        accentColor: string,
                        onClick: () => void,
                        isActive: boolean
                    ) => {
                        return (
                            <div
                                onClick={onClick}
                                style={{
                                    backgroundColor: 'var(--color-pg-card)',
                                    border: isActive ? `1.5px solid ${accentColor}` : '1px solid var(--color-pg-border)',
                                    borderTop: `4px solid ${accentColor}`,
                                    borderRadius: '12px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: isActive ? `0 0 10px ${accentColor}30` : 'none',
                                    transform: isActive ? 'translateY(-2px)' : 'none',
                                }}
                                className="hover-grow"
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    color: 'var(--color-pg-text-secondary)',
                                    fontSize: '14px',
                                    opacity: 0.6,
                                }}>
                                    →
                                </div>
                                <div style={{
                                    fontSize: '32px',
                                    fontWeight: 800,
                                    color: 'var(--color-pg-text)',
                                    lineHeight: 1.1,
                                    marginBottom: '4px',
                                }}>
                                    {value}
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    color: 'var(--color-pg-text)',
                                    marginBottom: '2px',
                                }}>
                                    {title}
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    color: 'var(--color-pg-text-secondary)',
                                    lineHeight: 1.3,
                                }}>
                                    {subtitle}
                                </div>
                            </div>
                        );
                    };

                    return (
                        <div style={{ marginBottom: '24px' }}>
                            {/* Filter and OTDR row */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '16px',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--color-pg-surface)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-pg-border)' }}>
                                    {['month', 'week', 'year'].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => handleRangeChange(r)}
                                            style={{
                                                padding: '6px 12px',
                                                backgroundColor: selected_range === r ? 'var(--color-pg-primary)' : 'transparent',
                                                color: selected_range === r ? '#fff' : 'var(--color-pg-text-secondary)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontWeight: 600,
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {r === 'week' ? (language === 'id' ? '7 Hari' : '7 Days') : r === 'month' ? (language === 'id' ? 'Bulan Ini' : 'This Month') : (language === 'id' ? 'Semua' : 'All')}
                                        </button>
                                    ))}
                                </div>
                                {telemetry && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 800, color: telemetry.otdr == null ? 'var(--color-pg-text-muted)' : telemetry.otdr >= 80 ? 'var(--color-pg-success)' : telemetry.otdr >= 60 ? 'var(--color-pg-warning)' : '#ef4444' }}>
                                            {telemetry.otdr != null ? `${telemetry.otdr}%` : (language === 'id' ? 'N/A' : 'N/A')}
                                        </div>
                                        {otdrDelta !== null && (
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: otdrDelta >= 0 ? 'var(--color-pg-success)' : '#ef4444' }}>
                                                {otdrDelta >= 0 ? '▲ +' : '▼ '}{otdrDelta}% <span style={{ color: 'var(--color-pg-text-muted)', fontWeight: 400 }}>{language === 'id' ? 'vs periode lalu' : 'vs last period'}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 4 Cards Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '14px',
                                marginBottom: '16px'
                            }}>
                                {renderSummaryCard(
                                    language === 'id' ? 'Terlambat' : 'Overdue',
                                    overdueCount,
                                    language === 'id' ? 'PO melewati deadline' : 'POs past deadline',
                                    '#ef4444',
                                    () => {
                                        changeTab('active');
                                        setActivePoFilter('delayed');
                                    },
                                    activeTab === 'active' && activePoFilter === 'delayed'
                                )}

                                {renderSummaryCard(
                                    language === 'id' ? 'Deadline Dekat' : 'Near Deadline',
                                    nearDeadlineCount,
                                    language === 'id' ? '≤ 3 hari lagi' : '≤ 3 days left',
                                    '#f97316',
                                    () => {
                                        changeTab('active');
                                        setActivePoFilter('close_due');
                                    },
                                    activeTab === 'active' && activePoFilter === 'close_due'
                                )}

                                {renderSummaryCard(
                                    language === 'id' ? 'Masalah Terbuka' : 'Open Troubles',
                                    openTroublesCount,
                                    language === 'id' ? 'Belum terselesaikan' : 'Unresolved issues',
                                    '#fbbf24',
                                    () => {
                                        changeTab('alerts');
                                    },
                                    activeTab === 'alerts'
                                )}

                                {renderSummaryCard(
                                    language === 'id' ? 'Selesai' : 'Completed',
                                    completedCount,
                                    language === 'id' ? (selected_range === 'week' ? 'Selesai 7 hari ini' : selected_range === 'year' ? 'Selesai tahun ini' : 'Selesai bulan ini') : (selected_range === 'week' ? 'Done this week' : selected_range === 'year' ? 'Done this year' : 'Done this month'),
                                    '#10b981',
                                    () => {
                                        changeTab('completed');
                                    },
                                    activeTab === 'completed'
                                )}
                            </div>

                            {/* Horizontal Stats Bar */}
                            <div style={{
                                backgroundColor: 'var(--color-pg-card)',
                                border: '1px solid var(--color-pg-border)',
                                borderRadius: '12px',
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '20px'
                            }}>
                                {/* Average Delay */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 200px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ef4444',
                                        flexShrink: 0,
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', fontWeight: 500 }}>
                                            {language === 'id' ? 'Rata-rata Keterlambatan' : 'Average Delay'}
                                        </div>
                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
                                            {avgDelayDays} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-pg-text-secondary)' }}>{language === 'id' ? 'hari' : 'days'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Overdue PO Count */}
                                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 120px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', fontWeight: 500 }}>
                                        {language === 'id' ? 'PO Terlambat' : 'Overdue POs'}
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-pg-text)', marginTop: '2px' }}>
                                        {overdueCount}
                                    </div>
                                </div>

                                {/* Worst delay */}
                                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 120px', textAlign: 'right' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', fontWeight: 500 }}>
                                        {language === 'id' ? 'Terburuk' : 'Worst Delay'}
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
                                        {worstDelayDays} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-pg-text-secondary)' }}>{language === 'id' ? 'hari' : 'days'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            {/* Alert Matrix Panel */}
            {/* ── Alerts Tab (extracted: features/owner/AlertsTab) ── */}
            {activeTab === 'alerts' && (
                <AlertsTab
                    language={language}
                    t={t}
                    alerts={alerts}
                    getUnifiedIssuesList={getUnifiedIssuesList}
                    formatAlertTime={formatAlertTime}
                    formatReasonType={formatReasonType}
                    changeTab={changeTab}
                    setExpandedPOs={setExpandedPOs}
                    setExpandedItems={setExpandedItems}
                />
            )}

            {/* ── PO Grid Section (extracted: features/owner/PoGridSection) ── */}
            {(activeTab === 'active' || activeTab === 'completed') && (
                <PoGridSection
                    activeTab={activeTab}
                    filteredPos={filteredPos}
                    activePoFilter={activePoFilter}
                    setActivePoFilter={setActivePoFilter}
                    expandedPOs={expandedPOs}
                    expandedItems={expandedItems}
                    togglePO={togglePO}
                    toggleItem={toggleItem}
                    language={language}
                    t={t}
                    alerts={alerts}
                    telemetry={telemetry}
                    workflow={workflow}
                    isOwner={isOwner}
                    handleCancel={handleCancel}
                    handleTerminate={handleTerminate}
                    renderStatusBadge={renderStatusBadge}
                    getItemStateColor={getItemStateColor}
                    getPieceLocations={getPieceLocations}
                    calculateDynamicETA={calculateDynamicETA}
                    formatAlertTime={formatAlertTime}
                    copyItemStatusToClipboard={copyItemStatusToClipboard}
                    copiedItemId={copiedItemId}
                />
            )}

            {/* ── Matrix Tab (extracted: features/owner/MatrixTab) ── */}
            {activeTab === 'matrix' && (
                <MatrixTab
                    telemetry={telemetry}
                    selected_range={selected_range}
                    handleRangeChange={handleRangeChange}
                    matrixFilter={matrixFilter}
                    setMatrixFilter={setMatrixFilter}
                    language={language}
                    t={t}
                    tenant={tenant}
                    togglePO={togglePO}
                    changeTab={changeTab}
                    isPresentationMode={isPresentationMode}
                    togglePresentationMode={togglePresentationMode}
                    exportOpen={exportOpen}
                    setExportOpen={setExportOpen}
                    alerts={alerts}
                    setExpandedPOs={setExpandedPOs}
                    setExpandedItems={setExpandedItems}
                    dirCollapsed={dirCollapsed}
                    setDirCollapsed={setDirCollapsed}
                    directoryFilter={directoryFilter}
                    setDirectoryFilter={setDirectoryFilter}
                />
            )}


            </div>

            {/* ── Team / User Management Tab (extracted: features/owner/TeamTab) ── */}
            {activeTab === 'team' && (
                <TeamTab
                    users={users}
                    roles={roles}
                    auth_user={auth_user}
                    isOwner={isOwner}
                    language={language}
                    t={t}
                    userRoleFilter={userRoleFilter}
                    setUserRoleFilter={setUserRoleFilter}
                    openAddUser={openAddUser}
                    openAddAdmin={openAddAdmin}
                    openEditUser={openEditUser}
                    workflowMode={workflowMode}
                    setWorkflowMode={setWorkflowMode}
                    saveWorkflowSettings={saveWorkflowSettings}
                    isSavingSettings={isSavingSettings}
                    reqDesign={reqDesign}
                    setReqDesign={setReqDesign}
                    reqMaterial={reqMaterial}
                    setReqMaterial={setReqMaterial}
                    reqProductionForQc={reqProductionForQc}
                    setReqProductionForQc={setReqProductionForQc}
                    reqQcForDelivery={reqQcForDelivery}
                    setReqQcForDelivery={setReqQcForDelivery}
                    reqDeliveryForFinance={reqDeliveryForFinance}
                    setReqDeliveryForFinance={setReqDeliveryForFinance}
                    stageTemplates={stageTemplates}
                    setStageTemplates={setStageTemplates}
                    setEditingTemplate={setEditingTemplate}
                    setShowTemplateModal={setShowTemplateModal}
                    setTemplateFormName={setTemplateFormName}
                    setTemplateFormDesc={setTemplateFormDesc}
                    setTemplateFormStages={setTemplateFormStages}
                />
            )}

            {activeTab === 'branding' && (
                <div style={{ paddingTop: '20px' }}>
                    <CompanyBrandingSetup tenant={tenant} language={language} />
                </div>
            )}

            {confirmAlert.element}

            <UserManagementModals
                auth_user={auth_user}
                roles={roles}
                posts={posts}
                language={language}
                t={t}
                editingUser={editingUser}
                closeEditUser={closeEditUser}
                submitEditUser={submitEditUser}
                editName={editName}
                setEditName={setEditName}
                editRole={editRole}
                setEditRole={setEditRole}
                editPostId={editPostId}
                setEditPostId={setEditPostId}
                editLoginMethod={editLoginMethod}
                setEditLoginMethod={setEditLoginMethod}
                editUsername={editUsername}
                setEditUsername={setEditUsername}
                editPassword={editPassword}
                setEditPassword={setEditPassword}
                editPin={editPin}
                setEditPin={setEditPin}
                editSubmitting={editSubmitting}
                handleDeleteUser={handleDeleteUser}
                showAddUserModal={showAddUserModal}
                setShowAddUserModal={setShowAddUserModal}
                submitAddUser={submitAddUser}
                newUserName={newUserName}
                setNewUserName={setNewUserName}
                newUserRoleId={newUserRoleId}
                setNewUserRoleId={setNewUserRoleId}
                newUserPostId={newUserPostId}
                setNewUserPostId={setNewUserPostId}
                newUserLoginMethod={newUserLoginMethod}
                setNewUserLoginMethod={setNewUserLoginMethod}
                newUserUsername={newUserUsername}
                setNewUserUsername={setNewUserUsername}
                newUserPassword={newUserPassword}
                setNewUserPassword={setNewUserPassword}
                newUserPasswordConfirmation={newUserPasswordConfirmation}
                setNewUserPasswordConfirmation={setNewUserPasswordConfirmation}
                newUserPin={newUserPin}
                setNewUserPin={setNewUserPin}
                addUserSubmitting={addUserSubmitting}
                showAddAdminModal={showAddAdminModal}
                setShowAddAdminModal={setShowAddAdminModal}
                submitAddAdmin={submitAddAdmin}
                adminName={adminName}
                setAdminName={setAdminName}
                adminRoleId={adminRoleId}
                setAdminRoleId={setAdminRoleId}
                adminPostId={adminPostId}
                setAdminPostId={setAdminPostId}
                adminUsername={adminUsername}
                setAdminUsername={setAdminUsername}
                adminPassword={adminPassword}
                setAdminPassword={setAdminPassword}
                adminPasswordConfirmation={adminPasswordConfirmation}
                setAdminPasswordConfirmation={setAdminPasswordConfirmation}
                adminSubmitting={adminSubmitting}
            />

            {/* ── Search Modal ────────────────────────────────────────── */}
            <SearchModal
                showSearchModal={showSearchModal}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                setShowSearchModal={setShowSearchModal}
                getSearchResults={getSearchResults}
                handleSearchItemClick={handleSearchItemClick}
                handleSearchAlertClick={handleSearchAlertClick}
                language={language}
                t={t}
                pos={pos ?? []}
            />


            {/* Version Footer */}
            <div style={{
                textAlign: 'center',
                padding: '24px 16px 8px',
                fontSize: '11px',
                color: 'var(--color-pg-text-muted)',
                opacity: 0.6,
                borderTop: '1px solid var(--color-pg-border-subtle)',
                marginTop: '32px',
            }}>
                beta1 (2026-07-17)
            </div>

            {/* ── Template Create/Edit Modal ─────────────────────────────── */}
            {showTemplateModal && (
                <StageTemplateModal
                    editingTemplate={editingTemplate}
                    templateFormName={templateFormName}
                    setTemplateFormName={setTemplateFormName}
                    templateFormDesc={templateFormDesc}
                    setTemplateFormDesc={setTemplateFormDesc}
                    templateFormStages={templateFormStages}
                    setTemplateFormStages={setTemplateFormStages}
                    isSavingTemplate={isSavingTemplate}
                    setIsSavingTemplate={setIsSavingTemplate}
                    allStages={ALL_STAGES_TEMPLATE}
                    onClose={() => setShowTemplateModal(false)}
                    onSaved={setStageTemplates}
                    t={t}
                />
            )}

            {selectedItemIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[50] flex items-center gap-3 px-5 py-3 bg-pg-surface border border-pg-border rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
                    <span className="text-pg-text-secondary text-sm">
                        {selectedItemIds.size} selected
                    </span>
                    <button
                        onClick={() => {
                            if (confirm(`Cancel ${selectedItemIds.size} items?`)) {
                                router.post('/items/batch-action', {
                                    action: 'cancel',
                                    item_ids: Array.from(selectedItemIds),
                                });
                                setSelectedItemIds(new Set());
                            }
                        }}
                        className="px-4 py-2 bg-red-500 text-white border-none rounded-lg font-semibold cursor-pointer"
                    >
                        Cancel Selected
                    </button>
                    <button
                        onClick={() => {
                            if (confirm(`Terminate ${selectedItemIds.size} items? This will trigger sunk-cost billing.`)) {
                                router.post('/items/batch-action', {
                                    action: 'terminate',
                                    item_ids: Array.from(selectedItemIds),
                                });
                                setSelectedItemIds(new Set());
                            }
                        }}
                        className="px-4 py-2 bg-amber-500 text-white border-none rounded-lg font-semibold cursor-pointer"
                    >
                        Terminate Selected
                    </button>
                    <button
                        onClick={() => setSelectedItemIds(new Set())}
                        className="p-2 bg-transparent text-pg-text-muted border-none cursor-pointer text-lg"
                    >
                        &times;
                    </button>
                </div>
            )}

            </div>
        </AppLayout>
    );
}





