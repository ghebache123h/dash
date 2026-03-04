'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    {
        label: 'Overview',
        href: '/',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
        ),
    },
    {
        label: 'Escalations',
        href: '/crm',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
    },
    {
        label: 'Settings',
        href: '/settings',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />
            </svg>
        ),
    },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: 'var(--sidebar-width)',
            height: '100vh',
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50,
            overflow: 'hidden',
        }}>
            {/* Logo */}
            <div style={{
                padding: '24px 24px 20px',
                borderBottom: '1px solid var(--border-color)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                    }}>
                        AI
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-highlight)', lineHeight: 1.2 }}>
                            Analytics
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                            AI Support Agent
                        </div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ padding: '16px 12px', flex: 1 }}>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0 12px', marginBottom: '8px' }}>
                    Menu
                </div>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: isActive ? 500 : 400,
                                color: isActive ? 'var(--text-highlight)' : 'var(--text-secondary)',
                                background: isActive ? 'var(--accent-blue-glow)' : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.15s ease',
                                marginBottom: '2px',
                            }}
                        >
                            <span style={{ opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
                            {item.label}
                            {isActive && (
                                <div style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: 'var(--accent-blue)',
                                    marginLeft: 'auto',
                                    boxShadow: '0 0 8px var(--accent-blue)',
                                }} />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--border-color)',
                fontSize: '11px',
                color: 'var(--text-muted)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--accent-emerald)',
                        boxShadow: '0 0 8px var(--accent-emerald)',
                        animation: 'pulse-glow 2s ease-in-out infinite',
                    }} />
                    System Online
                </div>
            </div>
        </aside>
    );
}
