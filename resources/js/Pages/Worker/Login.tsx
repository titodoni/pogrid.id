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

export default function WorkerLogin({ tenant, workers }: Props) {
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [pin, setPin] = useState('');
    const [showPinResetModal, setShowPinResetModal] = useState(false);

    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        user_id: '',
        pin: '',
    });

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
            setError('pin', 'Please select a worker first.');
            return;
        }
        if (pin.length < 4) {
            setError('pin', 'PIN must be at least 4 digits.');
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
            padding: '24px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '680px',
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#3b82f6', fontWeight: 700, letterSpacing: '0.1em', margin: 0 }}>
                        {tenant.company_name}
                    </h2>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 0 0', letterSpacing: '-0.02em' }}>
                        Worker Entrance
                    </h1>
                </div>

                <div className="responsive-grid responsive-grid-half" style={{ gap: '32px' }}>
                    {/* Worker Selector Left Column */}
                    <div>
                        <h3 style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '12px', fontWeight: 600 }}>
                            Select Your Name
                        </h3>
                        <div style={{
                            maxHeight: '340px',
                            overflowY: 'auto',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            backgroundColor: '#090d16',
                            padding: '8px'
                        }}>
                            {workers.length === 0 ? (
                                <p style={{ padding: '16px', color: '#64748b', textAlign: 'center', fontSize: '14px' }}>
                                    No workers registered.
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
                                            justifyContent: 'between',
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
                                {selectedWorker ? `Entering PIN for: ${selectedWorker.name}` : 'Select worker to enter PIN'}
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
                                CLEAR
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
                            {processing ? 'Verifying...' : 'VERIFY & ENTER'}
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
                                Forgot PIN?
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
                        maxWidth: '400px'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>Forgot PIN</h3>
                        <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 20px 0' }}>
                            Request a PIN reset for <strong style={{ color: '#f8fafc' }}>{selectedWorker.name}</strong>?
                            Admin will generate a new PIN.
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
                                Cancel
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
                                {processing ? 'Sending...' : 'Request Reset'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
