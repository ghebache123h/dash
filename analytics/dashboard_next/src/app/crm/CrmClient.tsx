'use client';

import { useEffect } from 'react';
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

    // Mandatory 15s Auto-refresh matching the Dashboard behavior
    useEffect(() => {
        const timer = setInterval(() => router.refresh(), 15000);
        return () => clearInterval(timer);
    }, [router]);

    // Trigger Notification if escalations increase
    useEffect(() => {
        notifyEscalation(data.kpis.supportEscalationCount);
    }, [data.kpis.supportEscalationCount, notifyEscalation]);

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
                <div style={{ padding: "20px" }}>
                    <span className="badge badge-danger" style={{ fontSize: "12px" }}>
                        {data.escalationRows.length} escalated conversation{data.escalationRows.length === 1 ? "" : "s"}
                    </span>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t('th_customer')}</th>
                            <th>{t('th_conversation')}</th>
                            <th>{t('th_esc_count')}</th>
                            <th>{t('th_reason')}</th>
                            <th>{t('th_first_esc')}</th>
                            <th>{t('th_last_esc')}</th>
                            <th>{t('th_pattern')}</th>
                            <th>{t('th_reference')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.escalationRows.map((row) => (
                            <tr key={`${row.customerId}-${row.conversationId}`}>
                                <td>{row.customerId}</td>
                                <td>{row.conversationId}</td>
                                <td>{row.escalationCount}</td>
                                <td>{row.escalationReason}</td>
                                <td>{safeLocaleDate(row.firstEscalationAt as Date)}</td>
                                <td>{safeLocaleDate(row.lastEscalationAt as Date)}</td>
                                <td>{row.repeated ? t('pattern_repeated') : t('pattern_single')}</td>
                                <td>
                                    {row.conversationReference ? (
                                        <a href={row.conversationReference} target="_blank" rel="noreferrer" style={{ color: "var(--accent-blue)" }}>
                                            {t('action_open')}
                                        </a>
                                    ) : (
                                        "-"
                                    )}
                                </td>
                            </tr>
                        ))}
                        {data.escalationRows.length === 0 && (
                            <tr>
                                <td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                                    {t('no_escalations')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
