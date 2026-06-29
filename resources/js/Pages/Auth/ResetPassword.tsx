import React from 'react';
import { useForm, Link, usePage } from '@inertiajs/react';

interface Props {
    token: string;
}

export default function ResetPassword({ token }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        token: token,
        email: '',
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/reset-password');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            fontFamily: 'Inter, sans-serif',
            color: '#f8fafc',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '40px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 800,
                        letterSpacing: '-0.025em',
                        background: 'linear-gradient(to right, #60a5fa, #3b82f6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '8px'
                    }}>
                        POgrid.id
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                        Set a new password
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <input type="hidden" name="token" value={data.token} />

                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="email" style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#94a3b8',
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: '#0f172a',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: '#f8fafc',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            placeholder="Enter your email"
                            required
                        />
                        {errors.email && (
                            <span style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                                {errors.email}
                            </span>
                        )}
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="password" style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#94a3b8',
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            New Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: '#0f172a',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: '#f8fafc',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            placeholder="••••••••"
                            required
                        />
                        {errors.password && (
                            <span style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                                {errors.password}
                            </span>
                        )}
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label htmlFor="password_confirmation" style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#94a3b8',
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            id="password_confirmation"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: '#0f172a',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: '#f8fafc',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        style={{
                            width: '100%',
                            padding: '14px',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            fontWeight: 600,
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '16px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s, transform 0.1s',
                            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                            marginBottom: '20px'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                    >
                        {processing ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', fontSize: '14px' }}>
                    <span style={{ color: '#94a3b8' }}>Remember your password? </span>
                    <Link href="/login" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
