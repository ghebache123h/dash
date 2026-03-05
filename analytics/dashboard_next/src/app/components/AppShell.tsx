'use client';

import { type ReactNode, useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthProvider';
import { I18nProvider } from './I18nProvider';
import { LoginScreen } from './LoginScreen';
import { Sidebar } from './Sidebar';
import { ThemeProvider } from './ThemeProvider';
import { NotificationProvider } from './NotificationProvider';

function AuthGate({ children }: { children: ReactNode }) {
    const { authenticated } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved) setIsCollapsed(saved === 'true');
    }, []);

    const toggleSidebar = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sidebar-collapsed', String(next));
            return next;
        });
    };

    if (!authenticated) return <LoginScreen />;
    return (
        <ThemeProvider>
            <NotificationProvider>
                <div style={{
                    display: 'flex',
                    minHeight: '100vh',
                    '--sidebar-width': isCollapsed ? '80px' : '260px',
                } as React.CSSProperties}>
                    <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
                    <main style={{
                        flex: 1,
                        marginLeft: 'var(--sidebar-width)',
                        padding: '32px',
                        minHeight: '100vh',
                        overflow: 'auto',
                        transition: 'margin-left 0.3s ease',
                    }}>
                        {children}
                    </main>
                </div>
            </NotificationProvider>
        </ThemeProvider>
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
