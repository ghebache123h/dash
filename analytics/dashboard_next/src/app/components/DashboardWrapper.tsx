'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useI18n } from './I18nProvider';

interface DashboardWrapperProps {
    children: ReactNode;
    costSection: ReactNode;
}

export function DashboardWrapper({ children, costSection }: DashboardWrapperProps) {
    const { role } = useAuth();
    const { t } = useI18n();
    const router = useRouter();
    const [refreshInterval, setRefreshInterval] = useState(0);

    // Auto-refresh
    useEffect(() => {
        if (refreshInterval <= 0) return;
        const timer = setInterval(() => {
            router.refresh();
        }, refreshInterval);
        return () => clearInterval(timer);
    }, [refreshInterval, router]);

    return (
        <div>
            {/* Auto-refresh controls */}
            <div style={{
                display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16,
                flexWrap: 'wrap',
            }}>
                <span className="small-label" style={{ marginBottom: 0 }}>{t('auto_refresh')}</span>
                {[
                    { label: t('refresh_off'), ms: 0 },
                    { label: t('refresh_30s'), ms: 30000 },
                    { label: t('refresh_60s'), ms: 60000 },
                ].map(opt => (
                    <button
                        key={opt.ms}
                        type="button"
                        className={refreshInterval === opt.ms ? 'btn-primary' : 'btn-secondary'}
                        style={{ padding: '5px 12px', fontSize: 12 }}
                        onClick={() => setRefreshInterval(opt.ms)}
                    >
                        {opt.label}
                        {refreshInterval === opt.ms && refreshInterval > 0 && (
                            <span style={{
                                display: 'inline-block',
                                width: 6, height: 6,
                                borderRadius: '50%',
                                background: 'var(--accent-emerald)',
                                boxShadow: '0 0 6px var(--accent-emerald)',
                                marginLeft: 6,
                                animation: 'pulse-glow 2s ease-in-out infinite',
                            }} />
                        )}
                    </button>
                ))}
            </div>

            {children}

            {/* Cost section — admin only */}
            {role === 'admin' && costSection}
        </div>
    );
}
