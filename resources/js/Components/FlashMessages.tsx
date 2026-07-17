import React, { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

const errorTranslations: Record<string, { en: string; id: string }> = {
    auth_failed: {
        en: 'These credentials do not match our records.',
        id: 'Kredensial yang Anda masukkan salah.',
    },
    user_not_found: {
        en: 'No account found with that username/email.',
        id: 'Tidak ada akun dengan username/email tersebut.',
    },
    user_not_found_worker: {
        en: 'Selected worker not found in this company.',
        id: 'Pekerja yang dipilih tidak ditemukan di perusahaan ini.',
    },
    wrong_password: {
        en: 'Incorrect password. Please try again.',
        id: 'Password salah. Silakan coba lagi.',
    },
    pin_incorrect: {
        en: 'Incorrect PIN. Please try again.',
        id: 'PIN salah. Silakan coba lagi.',
    },
    admin_must_use_password: {
        en: 'Administrative users must log in via password at the login page.',
        id: 'Pengguna administratif harus masuk menggunakan password di halaman login.',
    },
    too_many_attempts: {
        en: 'Too many attempts. Please wait 1 minute before trying again.',
        id: 'Terlalu banyak percobaan. Harap tunggu 1 menit sebelum mencoba lagi.',
    },
    network_error: {
        en: 'Poor network connection. Please check your internet.',
        id: 'Koneksi buruk. Silakan periksa jaringan internet Anda.',
    },
    select_worker_error: {
        en: 'Please select a worker first.',
        id: 'Silakan pilih nama pekerja terlebih dahulu.',
    },
    pin_length_error: {
        en: 'PIN must be at least 4 digits.',
        id: 'PIN minimal harus 4 angka.',
    },
};

function getLang(): 'en' | 'id' {
    if (typeof window !== 'undefined') {
        return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'en';
    }
    return 'en';
}

function resolveErrorMessages(errors: Record<string, string>): string[] {
    const lang = getLang();
    return Object.values(errors).map((key) => {
        const entry = errorTranslations[key];
        return entry ? entry[lang] : key;
    });
}

const icons = {
    success: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    error: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    ),
    warning: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    info: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
};

const typeStyles = {
    success: {
        bg: 'rgba(52, 211, 153, 0.95)',
        border: '1px solid rgba(52, 211, 153, 0.3)',
    },
    error: {
        bg: 'rgba(248, 113, 113, 0.95)',
        border: '1px solid rgba(248, 113, 113, 0.3)',
    },
    warning: {
        bg: 'rgba(251, 191, 36, 0.95)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
    },
    info: {
        bg: 'rgba(99, 102, 241, 0.95)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
    },
};

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    type: ToastType;
    messages: string[];
    id: number;
}

let toastId = 0;

export default function FlashMessages() {
    const { flash, errors } = usePage<{ flash: Record<string, string>; errors: Record<string, string> }>().props;
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [dismissed, setDismissed] = useState<Set<number>>(new Set());

    useEffect(() => {
        const newToasts: Toast[] = [];

        if (flash?.success) {
            newToasts.push({ type: 'success', messages: [flash.success], id: ++toastId });
        }

        if (flash?.error) {
            newToasts.push({ type: 'error', messages: [flash.error], id: ++toastId });
        }

        if (flash?.warning) {
            newToasts.push({ type: 'warning', messages: [flash.warning], id: ++toastId });
        }

        if (flash?.info) {
            newToasts.push({ type: 'info', messages: [flash.info], id: ++toastId });
        }

        if (errors && Object.keys(errors).length > 0) {
            newToasts.push({ type: 'error', messages: resolveErrorMessages(errors), id: ++toastId });
        }

        if (newToasts.length > 0) {
            setToasts((prev) => [...prev, ...newToasts]);

            newToasts.forEach((toast) => {
                setTimeout(() => {
                    setDismissed((prev) => new Set(prev).add(toast.id));
                }, 6000);
            });
        }
    }, [flash, errors]);

    const dismiss = (id: number) => {
        setDismissed((prev) => new Set(prev).add(id));
    };

    const visibleToasts = toasts.filter((t) => !dismissed.has(t.id));

    if (visibleToasts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '420px',
            width: '100%',
        }}>
            {visibleToasts.map((toast) => {
                const style = typeStyles[toast.type];
                return (
                    <div
                        key={toast.id}
                        onClick={() => dismiss(toast.id)}
                        style={{
                            backgroundColor: style.bg,
                            color: '#fff',
                            padding: '14px 16px',
                            borderRadius: '14px',
                            fontSize: '14px',
                            fontWeight: 500,
                            lineHeight: 1.5,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                            backdropFilter: 'blur(8px)',
                            border: style.border,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            cursor: 'pointer',
                            animation: 'slideIn 0.25s ease-out',
                            transition: 'opacity 0.2s',
                        }}
                    >
                        <div style={{
                            flexShrink: 0,
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '1px',
                        }}>
                            {icons[toast.type]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {toast.messages.map((msg, i) => (
                                <div key={i}>{msg}</div>
                            ))}
                        </div>
                        <div style={{
                            flexShrink: 0,
                            opacity: 0.6,
                            fontSize: '16px',
                            lineHeight: 1,
                            marginTop: '1px',
                        }}>
                            ✕
                        </div>
                    </div>
                );
            })}
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
