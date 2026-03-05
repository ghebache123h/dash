'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useI18n } from './I18nProvider';
import { useTheme } from './ThemeProvider';
import { useNotification } from './NotificationProvider';

const navItems = [
    {
        labelKey: 'overview',
        href: '/',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
        ),
    },
    {
        labelKey: 'escalations',
        href: '/crm',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
    },
    {
        labelKey: 'settings',
        href: '/settings',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />
            </svg>
        ),
    },
];

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

export function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
    const pathname = usePathname();
    const { username, role, logout } = useAuth();
    const { t, lang, setLang } = useI18n();
    const { theme, toggleTheme } = useTheme();
    const { isMuted, toggleMute } = useNotification();

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
            transition: 'width 0.3s ease',
        }}>
            {/* Logo */}
            <div style={{
                padding: isCollapsed ? '24px 12px 20px' : '24px 24px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
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
                        flexShrink: 0,
                    }}>
                        AI
                    </div>
                    {!isCollapsed && (
                        <div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-highlight)', lineHeight: 1.2 }}>
                                Analytics
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                                AI Support Agent
                            </div>
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <button onClick={toggleSidebar} className="btn-secondary" style={{ padding: 6, borderRadius: 8, display: 'flex' }} title="Collapse Sidebar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Collapse Button (When Collapsed) */}
            {isCollapsed && (
                <div style={{ padding: '12px', display: 'flex', justifyContent: 'center', borderBottom: '1px solid var(--border-color)' }}>
                    <button onClick={toggleSidebar} className="btn-secondary" style={{ padding: 6, borderRadius: 8, display: 'flex' }} title="Expand Sidebar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Language & Theme Controls */}
            {!isCollapsed ? (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label className="small-label" style={{ marginBottom: 6 }}>{t('language')}</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setLang('en')} className={lang === 'en' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: '6px 0', justifyContent: 'center', fontSize: 12 }}>EN</button>
                            <button onClick={() => setLang('ar')} className={lang === 'ar' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: '6px 0', justifyContent: 'center', fontSize: 12 }}>AR</button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between' }}>
                        <label className="small-label" style={{ margin: 0, flex: 1 }}>Theme</label>
                        <button
                            onClick={toggleTheme}
                            className="btn-secondary"
                            style={{ padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                        >
                            {theme === 'dark' ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="5" />
                                    <line x1="12" y1="1" x2="12" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="23" />
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                    <line x1="1" y1="12" x2="3" y2="12" />
                                    <line x1="21" y1="12" x2="23" y2="12" />
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                </svg>
                            )}
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-color)', marginTop: 8 }}>
                        <label className="small-label" style={{ margin: 0, flex: 1 }}>Sound</label>
                        <button
                            onClick={toggleMute}
                            className="btn-secondary"
                            style={{ padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <line x1="23" y1="9" x2="17" y2="15" />
                                    <line x1="17" y1="9" x2="23" y2="15" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="btn-secondary" style={{ padding: '6px', borderRadius: '8px', fontSize: 12 }} title="Toggle Language">
                        {lang === 'en' ? 'AR' : 'EN'}
                    </button>
                    <button onClick={toggleTheme} className="btn-secondary" style={{ padding: '6px', borderRadius: '8px', display: 'flex' }} title="Toggle Theme">
                        {theme === 'dark' ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>
                    <button onClick={toggleMute} className="btn-secondary" style={{ padding: '6px', borderRadius: '8px', display: 'flex' }} title={isMuted ? 'Unmute' : 'Mute'}>
                        {isMuted ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </svg>
                        )}
                    </button>
                </div>
            )}

            {/* Nav */}
            <nav style={{ padding: isCollapsed ? '16px 8px' : '16px 12px', flex: 1 }}>
                {!isCollapsed && (
                    <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0 12px', marginBottom: '8px' }}>
                        {t('menu')}
                    </div>
                )}
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={isCollapsed ? t(item.labelKey) : undefined}
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
                                justifyContent: isCollapsed ? 'center' : 'flex-start',
                            }}
                        >
                            <span style={{ opacity: isActive ? 1 : 0.6, flexShrink: 0 }}>{item.icon}</span>
                            {!isCollapsed && <span>{t(item.labelKey)}</span>}
                            {!isCollapsed && isActive && (
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

            {/* User + Logout */}
            <div style={{
                padding: isCollapsed ? '12px 0' : '12px 16px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                flexDirection: isCollapsed ? 'column' : 'row',
                gap: isCollapsed ? '12px' : 0,
            }}>
                {!isCollapsed && (
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-highlight)' }}>{username}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{role === 'admin' ? t('role_admin') : t('role_user')}</div>
                    </div>
                )}
                <button onClick={logout} style={{
                    background: 'var(--accent-rose-glow)',
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: isCollapsed ? '6px' : '6px 12px',
                    color: 'var(--accent-rose)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }} title={t('logout')}>
                    {isCollapsed ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    ) : t('logout')}
                </button>
            </div>

            {/* Footer */}
            <div style={{
                padding: isCollapsed ? '12px 0' : '12px 20px',
                borderTop: '1px solid var(--border-color)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={t('system_online')}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--accent-emerald)',
                        boxShadow: '0 0 8px var(--accent-emerald)',
                        animation: 'pulse-glow 2s ease-in-out infinite',
                        flexShrink: 0,
                    }} />
                    {!isCollapsed && <span>{t('system_online')}</span>}
                </div>
            </div>
        </aside>
    );
}
