import React, { useState, useEffect, useRef } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { ModalShell } from '../../Components/Modal/ModalShell';
import { localizedDisplay } from '../../Utils/locale';

interface Worker {
    id: number;
    name: string;
    role_name: string;
    role_display_name: string;
    role_display_name_id?: string | null;
    post_name?: string | null;
    post_display_name?: string | null;
    post_display_name_id?: string | null;
}

interface Tenant {
    id: number;
    company_name: string;
    slug: string;
}

interface Props {
    tenant: Tenant;
    workers: Worker[];
}

const translations = {
    en: {
        worker_entrance: "Worker Entrance",
        select_name: "Select Your Name",
        no_workers: "No workers registered.",
        entering_pin: "Entering PIN for: {name}",
        select_worker: "Select worker to enter PIN",
        verify_btn: "VERIFY & ENTER",
        verifying: "Verifying...",
        forgot_pin: "Forgot PIN?",
        forgot_pin_title: "Forgot PIN",
        forgot_pin_desc: "Request a PIN reset for {name}? Admin will generate a new PIN.",
        cancel: "Cancel",
        request_reset: "Request Reset",
        requesting: "Sending...",
        clear_btn: "CLEAR",
        select_worker_error: "Please select a worker first.",
        pin_length_error: "PIN must be at least 4 digits.",
        admin_must_use_password: "Administrative users must log in via password at /login.",
        pin_incorrect: "Incorrect PIN. Please try again.",
        user_not_found_worker: "Selected worker not found in this company.",
        too_many_attempts: "Too many attempts. Please wait 1 minute before trying again.",
        network_error: "Poor network connection. Please check your internet."
    },
    id: {
        worker_entrance: "Akses Masuk Pekerja",
        select_name: "Pilih Nama Anda",
        no_workers: "Tidak ada pekerja yang terdaftar.",
        entering_pin: "Masukkan PIN untuk: {name}",
        select_worker: "Pilih nama Anda untuk memasukkan PIN",
        verify_btn: "VERIFIKASI & MASUK",
        verifying: "Memproses...",
        forgot_pin: "Lupa PIN?",
        forgot_pin_title: "Lupa PIN",
        forgot_pin_desc: "Ajukan reset PIN untuk {name}? Admin akan membuatkan PIN baru.",
        cancel: "Batal",
        request_reset: "Ajukan Reset PIN",
        requesting: "Memproses...",
        clear_btn: "HAPUS",
        select_worker_error: "Silakan pilih nama pekerja terlebih dahulu.",
        pin_length_error: "PIN minimal harus 4 angka.",
        admin_must_use_password: "Pengguna administratif harus masuk menggunakan password di halaman login.",
        pin_incorrect: "PIN salah. Silakan coba lagi.",
        user_not_found_worker: "Pekerja yang dipilih tidak ditemukan di perusahaan ini.",
        too_many_attempts: "Terlalu banyak percobaan. Harap tunggu 1 menit sebelum mencoba lagi.",
        network_error: "Koneksi buruk. Silakan periksa jaringan internet Anda."
    }
};

export default function WorkerLogin({ tenant, workers }: Props) {
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [pin, setPin] = useState('');
    const [showPinResetModal, setShowPinResetModal] = useState(false);

    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        user_id: '',
        pin: '',
    });

    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'en';
        }
        return 'en';
    });

    const t = translations[language];

    const { props: pageProps } = usePage();
    const retryAfter = (pageProps as any).retry_after as number | undefined;
    const [countdown, setCountdown] = useState(0);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (retryAfter && retryAfter > 0) {
            setCountdown(retryAfter);
        }
    }, [retryAfter]);

    useEffect(() => {
        if (countdown > 0) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            countdownRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        if (countdownRef.current) clearInterval(countdownRef.current);
                        countdownRef.current = null;
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
            }
        };
    }, [countdown > 0]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedWorker) return;

            // Ignore if active input is a select dropdown
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA')) {
                return;
            }

            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleNumberClick(e.key);
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handleBackspace();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleClear();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e as any);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedWorker, pin, processing, countdown]);

    const handleNumberClick = (num: string) => {
        if (!selectedWorker || countdown > 0) return;
        if (pin.length < 6) {
            const newPin = pin + num;
            setPin(newPin);
            setData('pin', newPin);
            clearErrors('pin');
        }
    };

    const handleBackspace = () => {
        if (countdown > 0) return;
        const newPin = pin.slice(0, -1);
        setPin(newPin);
        setData('pin', newPin);
    };

    const handleClear = () => {
        if (countdown > 0) return;
        setPin('');
        setData('pin', '');
    };

    const handleWorkerSelect = (worker: Worker) => {
        setSelectedWorker(worker);
        setData('user_id', worker.id.toString());
        setPin('');
        setData('pin', '');
        clearErrors();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (countdown > 0) return;
        clearErrors();
        if (!selectedWorker) {
            setError('pin', t.select_worker_error);
            return;
        }
        if (pin.length < 4) {
            setError('pin', t.pin_length_error);
            return;
        }
        if (!navigator.onLine) {
            setError('pin', 'network_error');
            return;
        }
        post(`/c/${tenant.slug}/login`);
    };

    return (
        <div style={{
            minHeight: '100dvh',
            backgroundColor: 'var(--color-pg-bg)',
            fontFamily: 'Inter, sans-serif',
            color: 'var(--color-pg-text)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
        }}>
            <div className="login-card animate-in w-full max-w-[420px] bg-zinc-900/80 backdrop-blur-xl border border-white/8 rounded-2xl p-6 shadow-2xl">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-pg-primary-hover)', fontWeight: 700, letterSpacing: '0.1em', margin: 0 }}>
                        {tenant.company_name}
                    </h2>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0 0 0', letterSpacing: '-0.02em' }}>
                        {t.worker_entrance}
                    </h1>
                </div>

                {/* Worker Selector Dropdown */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginBottom: '6px', fontWeight: 600, display: 'block' }}>
                        {t.select_name}
                    </label>
                    <select
                        value={selectedWorker?.id?.toString() || ''}
                        onChange={(e) => {
                            const worker = workers.find(w => w.id.toString() === e.target.value);
                            if (worker) handleWorkerSelect(worker);
                        }}
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            backgroundColor: 'var(--color-pg-input)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            color: 'var(--color-pg-text)',
                            fontSize: '15px',
                            fontWeight: 600,
                            outline: 'none',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            cursor: 'pointer',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            backgroundSize: '16px',
                        }}
                    >
                        <option value="">{t.select_name}...</option>
                        {workers.map((worker) => {
                            const position = worker.post_display_name
                                ? { display_name: worker.post_display_name, display_name_id: worker.post_display_name_id }
                                : { display_name: worker.role_display_name, display_name_id: worker.role_display_name_id };
                            return (
                                <option key={worker.id} value={worker.id}>
                                    {worker.name} — {localizedDisplay(position, language)}
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* PIN Input */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        {selectedWorker ? t.entering_pin.replace('{name}', selectedWorker.name) : t.select_worker}
                    </div>
                    <div style={{
                        height: '44px',
                        maxWidth: '200px',
                        margin: '0 auto',
                        backgroundColor: 'var(--color-pg-input)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        letterSpacing: '8px',
                        color: '#a5b4fc',
                    }}>
                        {'•'.repeat(pin.length)}
                    </div>
                    {countdown > 0 ? (
                        <div style={{ color: 'var(--color-pg-warning)', fontSize: '11px', marginTop: '4px' }}>
                            {t.too_many_attempts.replace('1 minute', `${countdown}s`)}
                        </div>
                    ) : Object.keys(errors).length > 0 && (
                        <div style={{ color: 'var(--color-pg-danger)', fontSize: '11px', marginTop: '4px' }}>
                            {t[Object.values(errors)[0] as keyof typeof t] || Object.values(errors)[0]}
                        </div>
                    )}
                </div>

                {/* Touch Numpad */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                    maxWidth: '280px',
                    margin: '0 auto',
                }}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                        <button
                            key={num}
                            type="button"
                            onClick={() => handleNumberClick(num)}
                            disabled={!selectedWorker || countdown > 0}
                            className="focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-white/10 active:scale-95 transition-all duration-150"
                            style={{
                                height: '60px',
                                fontSize: '20px',
                                fontWeight: 700,
                                borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                color: selectedWorker && !countdown ? 'var(--color-pg-text)' : '#52525b',
                                cursor: selectedWorker && !countdown ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                outline: 'none',
                            }}
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={!selectedWorker || pin.length === 0 || countdown > 0}
                        className="focus:outline-none focus:ring-2 focus:ring-red-500/50 hover:brightness-110 active:scale-95 transition-all duration-150"
                        style={{
                            height: '60px',
                            fontSize: '12px',
                            fontWeight: 700,
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: 'rgba(248, 113, 113, 0.12)',
                            color: 'var(--color-pg-danger)',
                            cursor: (selectedWorker && pin.length > 0 && !countdown) ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {t.clear_btn}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleNumberClick('0')}
                        disabled={!selectedWorker || countdown > 0}
                        className="focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-white/10 active:scale-95 transition-all duration-150"
                        style={{
                            height: '60px',
                            fontSize: '20px',
                            fontWeight: 700,
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            color: selectedWorker && !countdown ? 'var(--color-pg-text)' : '#52525b',
                            cursor: selectedWorker && !countdown ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            outline: 'none',
                        }}
                    >
                        0
                    </button>
                    <button
                        type="button"
                        onClick={handleBackspace}
                        disabled={!selectedWorker || pin.length === 0 || countdown > 0}
                        className="focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-white/15 active:scale-95 transition-all duration-150"
                        style={{
                            height: '60px',
                            fontSize: '16px',
                            fontWeight: 700,
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: 'var(--color-pg-border)',
                            color: 'var(--color-pg-text)',
                            cursor: (selectedWorker && pin.length > 0 && !countdown) ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        ⌫
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={processing || !selectedWorker || pin.length < 4 || countdown > 0}
                    className="focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none transition-all duration-200"
                    style={{
                        width: '100%',
                        maxWidth: '280px',
                        display: 'block',
                        margin: '16px auto 0',
                        padding: '14px',
                        backgroundColor: (selectedWorker && pin.length >= 4 && !countdown) ? 'var(--color-pg-success)' : 'var(--color-pg-border)',
                        color: (selectedWorker && pin.length >= 4 && !countdown) ? '#ffffff' : 'var(--color-pg-text-muted)',
                        fontWeight: 700,
                        borderRadius: '10px',
                        border: 'none',
                        cursor: (selectedWorker && pin.length >= 4 && !countdown) ? 'pointer' : 'not-allowed',
                        fontSize: '15px',
                    }}
                >
                    {processing ? (
                        <div className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{t.verifying}</span>
                        </div>
                    ) : (
                        t.verify_btn
                    )}
                </button>

                {/* Forgot PIN */}
                {selectedWorker && (
                    <button
                        type="button"
                        onClick={() => setShowPinResetModal(true)}
                        className="focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-white/5 active:scale-95 transition-all duration-150"
                        style={{
                            width: '100%',
                            maxWidth: '280px',
                            display: 'block',
                            margin: '8px auto 0',
                            padding: '12px',
                            backgroundColor: 'transparent',
                            color: 'var(--color-pg-text-muted)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        {t.forgot_pin}
                    </button>
                )}
            </div>

            {/* Forgot PIN Confirmation Modal */}
            <ModalShell
                isOpen={showPinResetModal && !!selectedWorker}
                onClose={() => setShowPinResetModal(false)}
                title={t.forgot_pin_title}
                size="sm"
                zIndex={50}
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    post(`/c/${tenant.slug}/pin-reset/request`, {
                        onSuccess: () => {
                            setShowPinResetModal(false);
                            setPin('');
                            setData('pin', '');
                            setSelectedWorker(null);
                        }
                    });
                }}>
                    <p style={{ fontSize: '14px', color: 'var(--color-pg-text-secondary)', margin: '0 0 20px 0' }}>
                        {selectedWorker && t.forgot_pin_desc.replace('{name}', selectedWorker.name)}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={() => setShowPinResetModal(false)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'transparent',
                                color: 'var(--color-pg-text-secondary)',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {t.cancel}
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            style={{
                                padding: '8px 16px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                color: '#fff',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {processing ? t.requesting : t.request_reset}
                        </button>
                    </div>
                </form>
            </ModalShell>
        </div>
    );
}
