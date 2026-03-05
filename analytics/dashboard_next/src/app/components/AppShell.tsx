'use client';

import { type ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthProvider';
import { I18nProvider } from './I18nProvider';
import { LoginScreen } from './LoginScreen';
import { Sidebar } from './Sidebar';

function AuthGate({ children }: { children: ReactNode }) {
    const { authenticated } = useAuth();
    if (!authenticated) return <LoginScreen />;
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{
                flex: 1,
                marginLeft: 'var(--sidebar-width)',
                padding: '32px',
                minHeight: '100vh',
                overflow: 'auto',
            }}>
                {children}
            </main>
        </div>
    );
}

export function AppShell({ children }: { children: ReactNode }) {
    return (
        <I18nProvider>
            <AuthProvider>
                <AuthGate>{children}</AuthGate>
            </AuthProvider>
        </I18nProvider>
    );
}
