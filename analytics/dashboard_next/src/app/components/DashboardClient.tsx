'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KpiCard } from './Card';
import { CostSection } from './CostSection';
import { FilterBar } from './FilterBar';
import { DashboardCharts } from './DashboardCharts';
import { useAuth } from './AuthProvider';
import { useI18n } from './I18nProvider';
import type { FilterState, DashboardData } from '@/lib/analytics';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function trendValue(current: number, previous: number): string {
    const delta = current - previous;
    if (Number.isNaN(delta)) return '0';
    if (Math.abs(delta) < 0.000001) return '0';
    const rounded = Number.isInteger(delta) ? delta.toString() : delta.toFixed(2);
    return `${delta > 0 ? '+' : ''}${rounded}`;
}

function trendPositive(current: number, previous: number, inverse = false): boolean {
    const delta = current - previous;
    if (delta === 0) return true;
    return inverse ? delta < 0 : delta > 0;
}

const eventLabelMap: Record<string, string> = {
    inbound_message: 'Inbound message',
    outbound_message: 'Outbound message',
    conversation_created: 'Conversation created',
    otp_request: 'OTP request',
    otp_outcome: 'OTP outcome',
    support_escalation: 'Support escalation',
    ai_usage: 'AI usage',
    intent_classification: 'Intent classification',
};

function safeLocaleDate(value: string | Date): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
}

/* ------------------------------------------------------------------ */
/*  Main client component                                              */
/* ------------------------------------------------------------------ */
interface Props {
    data: DashboardData;
    filters: FilterState;
    channels: string[];
    categories: string[];
}

export function DashboardClient({ data, filters, channels, categories }: Props) {
    const { role } = useAuth();
    const { t } = useI18n();
    const router = useRouter();
    const [refreshInterval, setRefreshInterval] = useState(0);
    const isAdmin = role === 'admin';

    // Auto-refresh
    useEffect(() => {
        if (refreshInterval <= 0) return;
        const timer = setInterval(() => router.refresh(), refreshInterval);
        return () => clearInterval(timer);
    }, [refreshInterval, router]);

    return (
        <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
            {/* Header */}
            <header style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-highlight)', margin: 0, letterSpacing: '-0.02em' }}>
                    {t('page_title')}
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {t('page_subtitle')} — {data.bucketLabel}
                </p>
            </header>

            {/* Auto-refresh controls */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
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
                                display: 'inline-block', width: 6, height: 6,
                                borderRadius: '50%', background: 'var(--accent-emerald)',
                                boxShadow: '0 0 6px var(--accent-emerald)', marginLeft: 6,
                                animation: 'pulse-glow 2s ease-in-out infinite',
                            }} />
                        )}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <FilterBar basePath="/" filters={filters} channels={channels} categories={categories} />

            {/* KPI Row 1 — Operations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <KpiCard
                    title={t('total_messages')}
                    value={data.kpis.totalMessages.toLocaleString()}
                    subtitle={`${t('total_messages')} (In + Out)`}
                    tooltip={t('tt_total_messages')}
                    accentColor="blue"
                    trend={{ value: trendValue(data.kpis.totalMessages, data.prevKpis.totalMessages), positive: trendPositive(data.kpis.totalMessages, data.prevKpis.totalMessages) }}
                    icon={<span>M</span>}
                />
                <KpiCard
                    title={t('new_conversations')}
                    value={data.kpis.newConversations.toLocaleString()}
                    accentColor="purple"
                    trend={{ value: trendValue(data.kpis.newConversations, data.prevKpis.newConversations), positive: trendPositive(data.kpis.newConversations, data.prevKpis.newConversations) }}
                    icon={<span>C</span>}
                />
                <KpiCard
                    title={t('disney_customers')}
                    value={data.kpis.disneyCustomers.toLocaleString()}
                    tooltip={t('tt_disney_customers')}
                    accentColor="cyan"
                    trend={{ value: trendValue(data.kpis.disneyCustomers, data.prevKpis.disneyCustomers), positive: trendPositive(data.kpis.disneyCustomers, data.prevKpis.disneyCustomers) }}
                    icon={<span>D</span>}
                />
                <KpiCard
                    title={t('disney_code_req')}
                    value={data.kpis.disneyCodeRequests.toLocaleString()}
                    tooltip={t('tt_disney_code_req')}
                    accentColor="amber"
                    trend={{ value: trendValue(data.kpis.disneyCodeRequests, data.prevKpis.disneyCodeRequests), positive: trendPositive(data.kpis.disneyCodeRequests, data.prevKpis.disneyCodeRequests) }}
                    icon={<span>R</span>}
                />
            </div>

            {/* KPI Row 2 — OTP & Performance */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <KpiCard
                    title={t('otp_success')}
                    value={data.kpis.otpSuccessCount.toLocaleString()}
                    subtitle={`${t('otp_failed')}: ${data.kpis.otpFailedCount} | ${t('otp_unconfirmed')}: ${data.kpis.otpUnconfirmedCount} | ${t('otp_not_sent')}: ${data.kpis.otpNotSentCount}`}
                    tooltip={t('tt_otp_success')}
                    accentColor="emerald"
                    trend={{ value: trendValue(data.kpis.otpSuccessCount, data.prevKpis.otpSuccessCount), positive: trendPositive(data.kpis.otpSuccessCount, data.prevKpis.otpSuccessCount) }}
                    icon={<span>S</span>}
                />
                <KpiCard
                    title={t('escalations')}
                    value={data.kpis.supportEscalationCount.toLocaleString()}
                    tooltip={t('tt_escalations')}
                    accentColor="rose"
                    trend={{ value: trendValue(data.kpis.supportEscalationCount, data.prevKpis.supportEscalationCount), positive: trendPositive(data.kpis.supportEscalationCount, data.prevKpis.supportEscalationCount, true) }}
                    icon={<span>E</span>}
                />
                <KpiCard
                    title={t('avg_msg_conv')}
                    value={data.kpis.avgMessagesPerConversation.toFixed(2)}
                    accentColor="blue"
                    trend={{ value: trendValue(data.kpis.avgMessagesPerConversation, data.prevKpis.avgMessagesPerConversation), positive: trendPositive(data.kpis.avgMessagesPerConversation, data.prevKpis.avgMessagesPerConversation) }}
                    icon={<span>A</span>}
                />
                {/* Token Totals — admin only */}
                {isAdmin && (
                    <KpiCard
                        title={t('token_totals')}
                        value={(data.kpis.inputTokensTotal + data.kpis.outputTokensTotal).toLocaleString()}
                        subtitle={`In ${data.kpis.inputTokensTotal.toLocaleString()} | Out ${data.kpis.outputTokensTotal.toLocaleString()}`}
                        accentColor="purple"
                        trend={{
                            value: trendValue(
                                data.kpis.inputTokensTotal + data.kpis.outputTokensTotal,
                                data.prevKpis.inputTokensTotal + data.prevKpis.outputTokensTotal,
                            ),
                            positive: trendPositive(
                                data.kpis.inputTokensTotal + data.kpis.outputTokensTotal,
                                data.prevKpis.inputTokensTotal + data.prevKpis.outputTokensTotal,
                                true,
                            ),
                        }}
                        icon={<span>T</span>}
                    />
                )}
            </div>

            {/* Charts */}
            <DashboardCharts
                messageTrendData={data.messageTrendData}
                conversationTrendData={data.conversationTrendData}
                tokenTrendData={isAdmin ? data.tokenTrendData : []}
                otpTrendData={data.otpTrendData}
                otpDonutData={data.otpDonutData}
                escalationTrendData={data.escalationTrendData}
                costTrendData={isAdmin ? data.costTrendData : []}
                showTokenCostCharts={isAdmin}
            />

            {/* Cost Section — admin only */}
            {isAdmin && (
                <CostSection
                    inputTokens={data.kpis.inputTokensTotal}
                    outputTokens={data.kpis.outputTokensTotal}
                    inputCost={data.kpis.inputCost}
                    outputCost={data.kpis.outputCost}
                    totalCost={data.kpis.totalCost}
                    inPricePerM={data.pricing.input_price_per_million}
                    outPricePerM={data.pricing.output_price_per_million}
                />
            )}

            {/* Recent Events table */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 10px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-highlight)' }}>{t('recent_events')}</h2>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                        {t('recent_events')} (200)
                    </p>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Event</th>
                            <th>Conversation</th>
                            <th>Customer</th>
                            <th>Category</th>
                            <th>Intent</th>
                            <th>OTP</th>
                            {isAdmin && <th>In tokens</th>}
                            {isAdmin && <th>Out tokens</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.recentEvents.map((event, idx) => (
                            <tr key={`${event.event_key}-${idx}`}>
                                <td>{safeLocaleDate(event.event_time)}</td>
                                <td>{eventLabelMap[event.event_type] || event.event_type}</td>
                                <td>{event.conversation_id || '-'}</td>
                                <td>{event.customer_id || '-'}</td>
                                <td>{event.category || '-'}</td>
                                <td>{event.intent || '-'}</td>
                                <td>{event.otp_status || '-'}</td>
                                {isAdmin && <td>{Number(event.token_input || 0).toLocaleString()}</td>}
                                {isAdmin && <td>{Number(event.token_output || 0).toLocaleString()}</td>}
                            </tr>
                        ))}
                        {data.recentEvents.length === 0 && (
                            <tr>
                                <td colSpan={isAdmin ? 9 : 7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No events for selected filters
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
