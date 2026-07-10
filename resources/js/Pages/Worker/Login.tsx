import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';

interface Worker {
    id: number;
    name: string;
    role: string;
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

    const handleNumberClick = (num: string) => {
        if (!selectedWorker) return;
        if (pin.length < 6) {
            const newPin = pin + num;
            setPin(newPin);
            setData('pin', newPin);
            clearErrors('pin');
        }
    };

    const handleBackspace = () => {
        const newPin = pin.slice(0, -1);
        setPin(newPin);
        setData('pin', newPin);
    };

    const handleClear = () => {
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
            backgroundColor: '#090d16',
            fontFamily: 'Inter, sans-serif',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
        }}>
            <div className="login-card w-full max-w-[420px] bg-slate-900/80 backdrop-blur-xl border border-white/8 rounded-2xl p-6 shadow-2xl">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#3b82f6', fontWeight: 700, letterSpacing: '0.1em', margin: 0 }}>
                        {tenant.company_name}
                    </h2>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0 0 0', letterSpacing: '-0.02em' }}>
                        {t.worker_entrance}
                    </h1>
                </div>

                {/* Worker Selector Dropdown */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600, display: 'block' }}>
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
                            backgroundColor: '#090d16',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            color: '#f8fafc',
                            fontSize: '15px',
                            fontWeight: 600,
                            outline: 'none',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            cursor: 'pointer',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            backgroundSize: '16px',
                        }}
                    >
                        <option value="">{t.select_name}...</option>
                        {workers.map((worker) => (
                            <option key={worker.id} value={worker.id}>
                                {worker.name} — {worker.role_name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* PIN Input */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
                        {selectedWorker ? t.entering_pin.replace('{name}', selectedWorker.name) : t.select_worker}
                    </div>
                    <div style={{
                        height: '44px',
                        maxWidth: '200px',
                        margin: '0 auto',
                        backgroundColor: '#090d16',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        letterSpacing: '8px',
                        color: '#38bdf8',
                    }}>
                        {'•'.repeat(pin.length)}
                    </div>
                    {Object.keys(errors).length > 0 && (
                        <div style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>
                            {t[Object.values(errors)[0] as keyof typeof t] || Object.values(errors)[0]}
                        </div>
                    )}
                </div>

                {/* Touch Numpad */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                    maxWidth: '220px',
                    margin: '0 auto',
                }}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                        <button
                            key={num}
                            type="button"
                            onClick={() => handleNumberClick(num)}
                            disabled={!selectedWorker}
                            style={{
                                height: '48px',
                                fontSize: '18px',
                                fontWeight: 700,
                                borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                color: selectedWorker ? '#f8fafc' : '#475569',
                                cursor: selectedWorker ? 'pointer' : 'not-allowed',
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
                        disabled={!selectedWorker || pin.length === 0}
                        style={{
                            height: '48px',
                            fontSize: '11px',
                            fontWeight: 700,
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            cursor: (selectedWorker && pin.length > 0) ? 'pointer' : 'not-allowed',
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
                        disabled={!selectedWorker}
                        style={{
                            height: '48px',
                            fontSize: '18px',
                            fontWeight: 700,
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            color: selectedWorker ? '#f8fafc' : '#475569',
                            cursor: selectedWorker ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        0
                    </button>
                    <button
                        type="button"
                        onClick={handleBackspace}
                        disabled={!selectedWorker || pin.length === 0}
                        style={{
                            height: '48px',
                            fontSize: '14px',
                            fontWeight: 700,
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            color: '#f8fafc',
                            cursor: (selectedWorker && pin.length > 0) ? 'pointer' : 'not-allowed',
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
                    disabled={processing || !selectedWorker || pin.length < 4}
                    style={{
                        width: '100%',
                        maxWidth: '220px',
                        display: 'block',
                        margin: '16px auto 0',
                        padding: '12px',
                        backgroundColor: (selectedWorker && pin.length >= 4) ? '#10b981' : '#1e293b',
                        color: (selectedWorker && pin.length >= 4) ? '#ffffff' : '#64748b',
                        fontWeight: 700,
                        borderRadius: '10px',
                        border: 'none',
                        cursor: (selectedWorker && pin.length >= 4) ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                    }}
                >
                    {processing ? t.verifying : t.verify_btn}
                </button>

                {/* Forgot PIN */}
                {selectedWorker && (
                    <button
                        type="button"
                        onClick={() => setShowPinResetModal(true)}
                        style={{
                            width: '100%',
                            maxWidth: '220px',
                            display: 'block',
                            margin: '8px auto 0',
                            padding: '10px',
                            backgroundColor: 'transparent',
                            color: '#64748b',
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
            {showPinResetModal && selectedWorker && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50
                }}>
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
                    }} style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        padding: '24px',
                        width: '100%',
                        maxWidth: '400px',
                        margin: '16px'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>{t.forgot_pin_title}</h3>
                        <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 20px 0' }}>
                            {t.forgot_pin_desc.replace('{name}', selectedWorker.name)}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setShowPinResetModal(false)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'transparent',
                                    color: '#94a3b8',
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
                                    backgroundColor: '#2563eb',
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
                </div>
            )}
        </div>
    );
}
