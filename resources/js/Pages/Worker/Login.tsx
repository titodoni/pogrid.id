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
        pin_length_error: "PIN must be at least 4 digits."
    },
    id: {
        worker_entrance: "Pintu Masuk Pekerja",
        select_name: "Pilih Nama Anda",
        no_workers: "Tidak ada pekerja yang terdaftar.",
        entering_pin: "Memasukkan PIN untuk: {name}",
        select_worker: "Pilih pekerja untuk memasukkan PIN",
        verify_btn: "VERIFIKASI & MASUK",
        verifying: "Memverifikasi...",
        forgot_pin: "Lupa PIN?",
        forgot_pin_title: "Lupa PIN",
        forgot_pin_desc: "Minta atur ulang PIN untuk {name}? Admin akan membuatkan PIN baru.",
        cancel: "Batal",
        request_reset: "Minta Atur Ulang",
        requesting: "Mengirim...",
        clear_btn: "HAPUS",
        select_worker_error: "Silakan pilih pekerja terlebih dahulu.",
        pin_length_error: "PIN minimal harus 4 digit."
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

    const changeLanguage = (lang: 'en' | 'id') => {
        setLanguage(lang);
        localStorage.setItem('pogrid_lang', lang);
    };

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
        if (!selectedWorker) {
            setError('pin', t.select_worker_error);
            return;
        }
        if (pin.length < 4) {
            setError('pin', t.pin_length_error);
            return;
        }
        post(`/c/${tenant.slug}/login`);
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#090d16',
            fontFamily: 'Inter, sans-serif',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            position: 'relative'
        }}>
            {/* Language Switcher */}
            <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'inline-flex',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(255,255,255,0.02)',
                zIndex: 10
            }}>
                <button
                    type="button"
                    onClick={() => changeLanguage('en')}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: language === 'en' ? '#2563eb' : 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    EN
                </button>
                <button
                    type="button"
                    onClick={() => changeLanguage('id')}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: language === 'id' ? '#2563eb' : 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    ID
                </button>
            </div>

            <div className="w-full max-w-[680px] bg-slate-900/80 backdrop-blur-xl border border-white/8 rounded-2xl p-6 sm:p-10 shadow-2xl">
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#3b82f6', fontWeight: 700, letterSpacing: '0.1em', margin: 0 }}>
                        {tenant.company_name}
                    </h2>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 0 0', letterSpacing: '-0.02em' }}>
                        {t.worker_entrance}
                    </h1>
                </div>

                <div className="responsive-grid responsive-grid-half" style={{ gap: '32px' }}>
                    {/* Worker Selector Left Column */}
                    <div>
                        <h3 style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '12px', fontWeight: 600 }}>
                            {t.select_name}
                        </h3>
                        <div style={{
                            maxHeight: '300px',
                            overflowY: 'auto',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            backgroundColor: '#090d16',
                            padding: '8px'
                        }}>
                            {workers.length === 0 ? (
                                <p style={{ padding: '16px', color: '#64748b', textAlign: 'center', fontSize: '14px' }}>
                                    {t.no_workers}
                                </p>
                            ) : (
                                workers.map((worker) => (
                                    <button
                                        key={worker.id}
                                        type="button"
                                        onClick={() => handleWorkerSelect(worker)}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '12px 16px',
                                            margin: '4px 0',
                                            backgroundColor: selectedWorker?.id === worker.id ? '#1e3a8a' : 'transparent',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: selectedWorker?.id === worker.id ? '#38bdf8' : '#e2e8f0',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: selectedWorker?.id === worker.id ? 700 : 500,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'background-color 0.15s'
                                        }}
                                    >
                                        <span style={{ flexGrow: 1 }}>{worker.name}</span>
                                        <span style={{
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                            color: '#94a3b8'
                                        }}>
                                            {worker.role}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* PIN Pad Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '100%', textAlign: 'center', marginBottom: '16px' }}>
                            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
                                {selectedWorker ? t.entering_pin.replace('{name}', selectedWorker.name) : t.select_worker}
                            </div>
                            <div style={{
                                height: '48px',
                                backgroundColor: '#090d16',
                                borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                                letterSpacing: '8px',
                                color: '#38bdf8'
                            }}>
                                {'•'.repeat(pin.length)}
                            </div>
                            {errors.pin && (
                                <div style={{ color: '#f87171', fontSize: '12px', marginTop: '6px' }}>
                                    {errors.pin}
                                </div>
                            )}
                        </div>

                        {/* Large Touch Numpad */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '12px',
                            width: '100%',
                            maxWidth: '240px'
                        }}>
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => handleNumberClick(num)}
                                    disabled={!selectedWorker}
                                    style={{
                                        aspectRatio: '1',
                                        fontSize: '20px',
                                        fontWeight: 700,
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        color: selectedWorker ? '#f8fafc' : '#475569',
                                        cursor: selectedWorker ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        outline: 'none',
                                        transition: 'background-color 0.1s'
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
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    borderRadius: '12px',
                                    border: 'none',
                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                    color: '#ef4444',
                                    cursor: (selectedWorker && pin.length > 0) ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {t.clear_btn}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleNumberClick('0')}
                                disabled={!selectedWorker}
                                style={{
                                    fontSize: '20px',
                                    fontWeight: 700,
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    color: selectedWorker ? '#f8fafc' : '#475569',
                                    cursor: selectedWorker ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                0
                            </button>
                            <button
                                type="button"
                                onClick={handleBackspace}
                                disabled={!selectedWorker || pin.length === 0}
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    borderRadius: '12px',
                                    border: 'none',
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: '#f8fafc',
                                    cursor: (selectedWorker && pin.length > 0) ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
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
                                maxWidth: '240px',
                                marginTop: '20px',
                                padding: '12px',
                                backgroundColor: (selectedWorker && pin.length >= 4) ? '#10b981' : '#1e293b',
                                color: (selectedWorker && pin.length >= 4) ? '#ffffff' : '#64748b',
                                fontWeight: 700,
                                borderRadius: '10px',
                                border: 'none',
                                cursor: (selectedWorker && pin.length >= 4) ? 'pointer' : 'not-allowed',
                                transition: 'background-color 0.2s'
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
                                    maxWidth: '240px',
                                    marginTop: '12px',
                                    padding: '10px',
                                    backgroundColor: 'transparent',
                                    color: '#64748b',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {t.forgot_pin}
                            </button>
                        )}
                    </div>
                </div>
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
