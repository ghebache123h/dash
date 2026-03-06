'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterBar } from "../components/FilterBar";
import { useNotification } from "../components/NotificationProvider";
import type { FilterState, DashboardData } from "@/lib/analytics";
import { useI18n } from '../components/I18nProvider';

function safeLocaleDate(value: string | Date | undefined): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }
    return date.toLocaleString();
}

interface CrmClientProps {
    data: DashboardData;
    filters: FilterState;
    channels: string[];
    categories: string[];
}

export function CrmClient({ data, filters, channels, categories }: CrmClientProps) {
    const router = useRouter();
    const { notifyEscalation } = useNotification();
    const { t } = useI18n();

    // CRM State for marking resolved escalations
    const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
    const [showResolved, setShowResolved] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const saved = localStorage.getItem('crm-resolved-escalations');
            if (saved) setResolvedIds(new Set(JSON.parse(saved)));
        } catch (e) { }
    }, []);

    const toggleResolved = (id: string) => {
        setResolvedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            localStorage.setItem('crm-resolved-escalations', JSON.stringify(Array.from(next)));
            return next;
        });
    };

    // Mandatory 15s Auto-refresh matching the Dashboard behavior
    useEffect(() => {
        const timer = setInterval(() => router.refresh(), 15000);
        return () => clearInterval(timer);
    }, [router]);

    // Trigger Notification if escalations increase
    useEffect(() => {
        notifyEscalation(data.kpis.supportEscalationCount);
    }, [data.kpis.supportEscalationCount, notifyEscalation]);

    const activeRows = !mounted ? data.escalationRows : data.escalationRows.filter(r => !resolvedIds.has(`${r.customerId}|${r.conversationId}`));
    const displayRows = !mounted ? data.escalationRows : (showResolved ? data.escalationRows : activeRows);

    return (
        <div style={{ maxWidth: "1500px", margin: "0 auto" }}>
            <header style={{ marginBottom: "20px" }}>
                <h1
                    style={{
                        fontSize: "28px",
                        fontWeight: 700,
                        color: "var(--text-highlight)",
                        margin: 0,
                        letterSpacing: "-0.02em",
                    }}
                >
                    {t('esc_monitor_title')}
                </h1>
                <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px" }}>
                    {t('esc_monitor_sub')}
                </p>
            </header>

            <div className="animate-fade-in-up delay-100">
                <FilterBar basePath="/crm" filters={filters} channels={channels} categories={categories} />
            </div>

            <div className="glass-card animate-fade-in-up delay-200" style={{ overflow: "hidden" }}>
                <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <span className="badge badge-danger" style={{ fontSize: "12px" }}>
                            {activeRows.length} active escalation{activeRows.length === 1 ? "" : "s"}
                        </span>
                        {resolvedIds.size > 0 && (
                            <span className="badge badge-success" style={{ fontSize: "12px" }}>
                                {resolvedIds.size} resolved
                            </span>
                        )}
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }}>
                        <input
                            type="checkbox"
                            checked={showResolved}
                            onChange={(e) => setShowResolved(e.target.checked)}
                            style={{ cursor: "pointer", accentColor: "var(--accent-blue)" }}
                        />
                        Show Resolved
                    </label>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>{t('th_customer')}</th>
                            <th>{t('th_conversation')}</th>
                            <th>{t('th_esc_count')}</th>
                            <th>{t('th_reason')}</th>
                            <th>{t('th_first_esc')}</th>
                            <th>{t('th_last_esc')}</th>
                            <th>{t('th_pattern')}</th>
                            <th>{t('th_reference')}</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayRows.map((row) => {
                            const escId = `${row.customerId}|${row.conversationId}`;
                            const isResolved = resolvedIds.has(escId);

                            return (
                                <tr key={escId} style={{ opacity: isResolved ? 0.6 : 1, transition: "opacity 0.2s" }}>
                                    <td>
                                        <div style={{
                                            width: 10, height: 10, borderRadius: '50%',
                                            background: isResolved ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                                        }} title={isResolved ? "Resolved" : "Pending"} />
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.customerId}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.conversationId}</td>
                                    <td>{row.escalationCount}</td>
                                    <td>{row.escalationReason}</td>
                                    <td>{safeLocaleDate(row.firstEscalationAt as Date)}</td>
                                    <td>{safeLocaleDate(row.lastEscalationAt as Date)}</td>
                                    <td>{row.repeated ? t('pattern_repeated') : t('pattern_single')}</td>
                                    <td>
                                        {row.conversationReference ? (
                                            <a href={row.conversationReference} target="_blank" rel="noreferrer"
                                                style={{ color: "var(--accent-blue)", display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                                </svg>
                                                {t('action_open')}
                                            </a>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => toggleResolved(escId)}
                                            style={{
                                                padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                                                background: isResolved ? 'transparent' : 'var(--accent-emerald-glow)',
                                                border: `1px solid ${isResolved ? 'var(--border-color)' : 'var(--accent-emerald)'}`,
                                                color: isResolved ? 'var(--text-muted)' : 'var(--accent-emerald)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {isResolved ? 'Reopen' : 'Resolve'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {displayRows.length === 0 && (
                            <tr>
                                <td colSpan={10} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                                    {data.escalationRows.length > 0 && !showResolved ? "All escalations are resolved. Toggle 'Show Resolved' to view." : t('no_escalations')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
