'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useI18n } from './I18nProvider';

export function LoginScreen() {
    const { login } = useAuth();
    const { t, lang, setLang } = useI18n();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(false);
        const ok = await login(username, password);
        setIsLoading(false);
        if (!ok) setError(true);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
        }}>
            <div className="animate-scale-in" style={{
                width: '100%',
                maxWidth: 420,
                padding: '40px 32px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: '0 0 60px rgba(59, 130, 246, 0.08)',
            }}>
                {/* Language toggle */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                    <button
                        onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                        style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 14px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: 13,
                        }}
                    >
                        {lang === 'en' ? 'العربية' : 'English'}
                    </button>
                </div>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 auto 16px',
                    }}>AI</div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-highlight)', margin: 0 }}>
                        {t('login_title')}
                    </h1>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 16 }}>
                        <label className="small-label">{t('username')}</label>
                        <input
                            className="input-dark"
                            type="text"
                            value={username}
                            onChange={e => { setUsername(e.target.value); setError(false); }}
                            placeholder={t('username')}
                        />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                        <label className="small-label">{t('password')}</label>
                        <input
                            className="input-dark"
                            type="password"
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(false); }}
                            placeholder={t('password')}
                        />
                    </div>
                    {error && (
                        <div style={{
                            marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                            background: 'var(--accent-rose-glow)', color: 'var(--accent-rose)',
                            fontSize: 13, fontWeight: 500,
                        }}>
                            {t('invalid_creds')}
                        </div>
                    )}
                    <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 15, opacity: isLoading ? 0.7 : 1 }}>
                        {isLoading ? '...' : t('login_btn')}
                    </button>
                </form>
            </div>
        </div>
    );
}
