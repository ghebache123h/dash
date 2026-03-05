'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KpiCard } from './Card';
import { CostSection } from './CostSection';
import { FilterBar } from './FilterBar';
import { DashboardCharts } from './DashboardCharts';
import { useAuth } from './AuthProvider';
import { useI18n } from './I18nProvider';
import { useNotification } from './NotificationProvider';
import type { FilterState, DashboardData } from '@/lib/analytics';

/* ------------------------------------------------------------------ */
/*  SVG Icons — professional, stroke-based                             */
/* ------------------------------------------------------------------ */
const iconStyle = { width: 20, height: 20 };
const sp = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const Icons = {
    messages: (
        <svg {...iconStyle} viewBox="0 0 24 24" {...sp}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="9" y1="10" x2="15" y2="10" />
        </svg>
    ),
    conversations: (
        <svg {...iconStyle} viewBox="0 0 24 24" {...sp}>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
    ),
    users: (
        <svg {...iconStyle} viewBox="0 0 24 24" {...sp}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    key: (
        <svg {...iconStyle} viewBox="0 0 24 24" {...sp}>
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
    ),
    shieldCheck: (
        <svg {...iconStyle} viewBox="0 0 24 24" {...sp}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
        </svg>
    ),
    percent: (
        <svg {...iconStyle} viewBox="0 0 24 24" {...sp}>
            <line x1="19" y1="5" x2="5" y2="19" />
            <circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
    ),
    alertTriangle: (
        <svg {...iconStyle} viewBox="0 0 24 24" {...sp}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    headphones: (
        <svg {...iconStyle} viewBox="0 0 24 24" {...sp}>
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
    ),
    barChart: (
        <svg {...iconStyle} viewBox="0 0 24 24" {...sp}>
            <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
        </svg>
    ),
    zap: (
        <svg {...iconStyle} viewBox="0 0 24 24" {...sp}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    ),
    target: (
        <svg {...iconStyle} viewBox="0 0 24 24" {...sp}>
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
    ),
};

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

function pct(numerator: number, denominator: number): string {
    if (denominator === 0) return '0%';
    return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function getEventLabelMap(t: (k: string) => string): Record<string, string> {
    return {
        inbound_message: t('event_inbound'),
        outbound_message: t('event_outbound'),
        conversation_created: t('event_new_conv'),
        otp_request: t('event_otp_req'),
        otp_outcome: t('event_otp_outcome'),
        support_escalation: t('event_escalation'),
        ai_usage: t('event_ai_usage'),
        intent_classification: t('event_intent'),
    };
}

function safeLocaleDate(value: string | Date): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
}

/* ------------------------------------------------------------------ */
/*  Percentage Ring — SVG radial gauge                                 */
/* ------------------------------------------------------------------ */
function PercentRing({ value, color, label, size = 100 }: { value: number; color: string; label: string; size?: number }) {
    const r = (size - 10) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (value / 100) * c;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
                    strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                    fill="var(--text-highlight)" fontSize={size * 0.24} fontWeight={700}
                    style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
                    {value.toFixed(1)}%
                </text>
            </svg>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        </div>
    );
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
    const { notifyEscalation } = useNotification();
    const isAdmin = role === 'admin';

    const defaultKpis = ['total_messages', 'new_conversations', 'disney_customers', 'disney_code_req', 'otp_success', 'otp_failed', 'escalations', 'avg_msg_conv'];
    const [visibleKpis, setVisibleKpis] = useState<string[]>(defaultKpis);
    const [showKpiMenu, setShowKpiMenu] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('visible-kpis');
        if (saved) {
            try { setVisibleKpis(JSON.parse(saved)); } catch (e) { }
        }
    }, []);

    const toggleKpi = (id: string) => {
        setVisibleKpis(prev => {
            const next = prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id];
            localStorage.setItem('visible-kpis', JSON.stringify(next));
            return next;
        });
    };

    // Mandatory 15s Auto-refresh
    useEffect(() => {
        const timer = setInterval(() => router.refresh(), 15000);
        return () => clearInterval(timer);
    }, [router]);

    const k = data.kpis;
    const pk = data.prevKpis;

    // Trigger Notification if escalations increase
    useEffect(() => {
        notifyEscalation(k.supportEscalationCount);
    }, [k.supportEscalationCount, notifyEscalation]);

    const eventLabelMap = getEventLabelMap(t);

    // Computed analytics

    // OTP Success Rate: (success + unconfirmed) / sent codes
    // "sent" = success + failed + unconfirmed (not_sent never reached user)
    const otpSentTotal = k.otpSuccessCount + k.otpFailedCount + k.otpUnconfirmedCount;
    const otpEffectiveSuccess = k.otpSuccessCount + k.otpUnconfirmedCount; // unconfirmed counts as success per user
    const otpSuccessRate = otpSentTotal > 0 ? (otpEffectiveSuccess / otpSentTotal) * 100 : 0;

    const prevOtpSentTotal = pk.otpSuccessCount + pk.otpFailedCount + pk.otpUnconfirmedCount;
    const prevOtpEffective = pk.otpSuccessCount + pk.otpUnconfirmedCount;
    const prevOtpSuccessRate = prevOtpSentTotal > 0 ? (prevOtpEffective / prevOtpSentTotal) * 100 : 0;

    // OTP Failure Rate (hard failure only)
    const otpFailureRate = otpSentTotal > 0 ? (k.otpFailedCount / otpSentTotal) * 100 : 0;

    // Delivery Rate: sent / requested
    const otpDeliveryRate = k.disneyCodeRequests > 0 ? (otpSentTotal / k.disneyCodeRequests) * 100 : 0;

    // Escalation Rate: escalations / conversations
    const conversationCount = k.newConversations || 1;
    const escalationRate = (k.supportEscalationCount / conversationCount) * 100;

    // AI Automation Rate: (conversations - escalations) / conversations
    const automationRate = conversationCount > 0 ? ((conversationCount - k.supportEscalationCount) / conversationCount) * 100 : 100;

    const kpiDefinitions: any[] = [
        {
            id: 'total_messages',
            title: t('total_messages'),
            value: k.totalMessages.toLocaleString(),
            subtitle: `In: ${(k.totalMessages - k.newConversations).toLocaleString()} · Out: ${k.newConversations.toLocaleString()}`,
            tooltip: t('tt_total_messages'),
            accentColor: 'blue',
            trend: { value: trendValue(k.totalMessages, pk.totalMessages), positive: trendPositive(k.totalMessages, pk.totalMessages) },
            icon: Icons.messages
        },
        {
            id: 'new_conversations',
            title: t('new_conversations'),
            value: k.newConversations.toLocaleString(),
            subtitle: "First inbound in period",
            accentColor: 'purple',
            trend: { value: trendValue(k.newConversations, pk.newConversations), positive: trendPositive(k.newConversations, pk.newConversations) },
            icon: Icons.conversations
        },
        {
            id: 'disney_customers',
            title: t('disney_customers'),
            value: k.disneyCustomers.toLocaleString(),
            subtitle: "Unique Disney users",
            tooltip: t('tt_disney_customers'),
            accentColor: 'cyan',
            trend: { value: trendValue(k.disneyCustomers, pk.disneyCustomers), positive: trendPositive(k.disneyCustomers, pk.disneyCustomers) },
            icon: Icons.users
        },
        {
            id: 'disney_code_req',
            title: t('disney_code_req'),
            value: k.disneyCodeRequests.toLocaleString(),
            subtitle: `Delivery rate: ${pct(otpSentTotal, k.disneyCodeRequests)}`,
            tooltip: t('tt_disney_code_req'),
            accentColor: 'amber',
            trend: { value: trendValue(k.disneyCodeRequests, pk.disneyCodeRequests), positive: trendPositive(k.disneyCodeRequests, pk.disneyCodeRequests) },
            icon: Icons.key
        },
        {
            id: 'otp_success',
            title: t('otp_success'),
            value: k.otpSuccessCount.toLocaleString(),
            subtitle: `Confirmed: ${k.otpSuccessCount} · Unconfirmed: ${k.otpUnconfirmedCount} (counted as success)`,
            tooltip: t('tt_otp_success'),
            accentColor: 'emerald',
            trend: { value: trendValue(k.otpSuccessCount, pk.otpSuccessCount), positive: trendPositive(k.otpSuccessCount, pk.otpSuccessCount) },
            icon: Icons.shieldCheck
        },
        {
            id: 'otp_failed',
            title: t('otp_failed'),
            value: k.otpFailedCount.toLocaleString(),
            subtitle: `Not sent: ${k.otpNotSentCount} · Failure rate: ${otpFailureRate.toFixed(1)}%`,
            tooltip: t('tt_otp_failed'),
            accentColor: 'rose',
            trend: { value: trendValue(k.otpFailedCount, pk.otpFailedCount), positive: trendPositive(k.otpFailedCount, pk.otpFailedCount, true) },
            icon: Icons.alertTriangle
        },
        {
            id: 'escalations',
            title: t('escalations'),
            value: k.supportEscalationCount.toLocaleString(),
            subtitle: `Escalation rate: ${escalationRate.toFixed(1)}%`,
            tooltip: t('tt_escalations'),
            accentColor: 'rose',
            trend: { value: trendValue(k.supportEscalationCount, pk.supportEscalationCount), positive: trendPositive(k.supportEscalationCount, pk.supportEscalationCount, true) },
            icon: Icons.headphones
        },
        {
            id: 'avg_msg_conv',
            title: t('avg_msg_conv'),
            value: k.avgMessagesPerConversation.toFixed(2),
            subtitle: "Conversation density",
            accentColor: 'blue',
            trend: { value: trendValue(k.avgMessagesPerConversation, pk.avgMessagesPerConversation), positive: trendPositive(k.avgMessagesPerConversation, pk.avgMessagesPerConversation) },
            icon: Icons.barChart
        }
    ];

    return (
        <div style={{ maxWidth: '1500px', margin: '0 auto', paddingBottom: 60 }}>
            {/* Header */}
            <header style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-highlight)', margin: 0, letterSpacing: '-0.02em' }}>
                            {t('page_title')}
                        </h1>
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {t('page_subtitle')} — {data.bucketLabel}
                    </p>
                </div>

                {/* Customization Menu */}
                <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowKpiMenu(!showKpiMenu)} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                            <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                            <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                        </svg>
                        Customize KPIs
                    </button>
                    {showKpiMenu && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: 12, width: 240, zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Visible Metrics</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {kpiDefinitions.map(kpi => (
                                    <label key={kpi.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={visibleKpis.includes(kpi.id)} onChange={() => toggleKpi(kpi.id)} style={{ cursor: 'pointer', accentColor: 'var(--accent-blue)' }} />
                                        {kpi.title}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Filters */}
            <FilterBar basePath="/" filters={filters} channels={channels} categories={categories} />

            {/* ═══════════ KPI Grid ═══════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {kpiDefinitions.filter(kpi => visibleKpis.includes(kpi.id)).map((kpi, index) => (
                    <div key={kpi.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                        <KpiCard
                            title={kpi.title}
                            value={kpi.value}
                            subtitle={kpi.subtitle}
                            tooltip={kpi.tooltip}
                            accentColor={kpi.accentColor}
                            trend={kpi.trend}
                            icon={kpi.icon}
                        />
                    </div>
                ))}
            </div>

            {/* ═══════════ Analytics Gauges — Success & Automation ═══════════ */}
            <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
                <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 600, color: 'var(--text-highlight)' }}>
                    {t('performance_gauges') || 'Performance Metrics'}
                </h2>
                <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}>
                    <PercentRing
                        value={otpSuccessRate}
                        color="#10b981"
                        label={t('otp_success_rate') || 'OTP Success Rate'}
                        size={110}
                    />
                    <PercentRing
                        value={otpDeliveryRate}
                        color="#06b6d4"
                        label={t('otp_delivery_rate') || 'OTP Delivery Rate'}
                        size={110}
                    />
                    <PercentRing
                        value={automationRate}
                        color="#8b5cf6"
                        label={t('automation_rate') || 'AI Automation Rate'}
                        size={110}
                    />
                    <PercentRing
                        value={100 - escalationRate}
                        color="#3b82f6"
                        label={t('self_service_rate') || 'Self-Service Rate'}
                        size={110}
                    />
                </div>
                {/* Legend */}
                <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: '16px 28px', justifyContent: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 600, color: '#10b981' }}>● OTP Success</span> = (Confirmed + Unconfirmed) / Sent
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 600, color: '#06b6d4' }}>● Delivery</span> = Sent / Requested
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 600, color: '#8b5cf6' }}>● Automation</span> = (Conv − Escalated) / Conv
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 600, color: '#3b82f6' }}>● Self-Service</span> = No human needed
                    </div>
                </div>
                {/* OTP vs Previous period */}
                <div style={{ marginTop: 20, display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <div className="glass-card" style={{ padding: '14px 20px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-highlight)' }}>
                            {otpSuccessRate.toFixed(1)}%
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('selected_period')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: 18, color: 'var(--text-muted)' }}>{t('vs')}</div>
                    <div className="glass-card" style={{ padding: '14px 20px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {prevOtpSuccessRate.toFixed(1)}%
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('prev_period')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={otpSuccessRate >= prevOtpSuccessRate ? 'badge-success' : 'badge-danger'} style={{
                            padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600
                        }}>
                            {otpSuccessRate >= prevOtpSuccessRate ? '▲' : '▼'}&nbsp;
                            {Math.abs(otpSuccessRate - prevOtpSuccessRate).toFixed(1)}pp
                        </span>
                    </div>
                </div>
            </div>

            {/* Admin-only: Token Totals KPI */}
            {isAdmin && (
                <div className="animate-fade-in-up delay-100" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <KpiCard
                        title={t('token_totals')}
                        value={(k.inputTokensTotal + k.outputTokensTotal).toLocaleString()}
                        subtitle={`In ${k.inputTokensTotal.toLocaleString()} · Out ${k.outputTokensTotal.toLocaleString()}`}
                        accentColor="purple"
                        trend={{
                            value: trendValue(k.inputTokensTotal + k.outputTokensTotal, pk.inputTokensTotal + pk.outputTokensTotal),
                            positive: trendPositive(k.inputTokensTotal + k.outputTokensTotal, pk.inputTokensTotal + pk.outputTokensTotal, true),
                        }}
                        icon={Icons.zap}
                    />
                </div>
            )}

            {/* Charts */}
            <div className="animate-fade-in-up delay-200">
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
            </div>

            {/* Cost Section — admin only */}
            {isAdmin && (
                <CostSection
                    inputTokens={k.inputTokensTotal}
                    outputTokens={k.outputTokensTotal}
                    inputCost={k.inputCost}
                    outputCost={k.outputCost}
                    totalCost={k.totalCost}
                    inPricePerM={data.pricing.input_price_per_million}
                    outPricePerM={data.pricing.output_price_per_million}
                />
            )}

            {/* ═══════════ Recent Events Table ═══════════ */}
            <div className="glass-card animate-fade-in-up delay-300" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 10px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-highlight)' }}>{t('recent_events')}</h2>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Latest 200 events in selected range
                    </p>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t('th_time')}</th>
                            <th>{t('th_event')}</th>
                            <th>{t('th_conversation')}</th>
                            <th>{t('th_customer')}</th>
                            <th>{t('th_category')}</th>
                            <th>{t('th_intent')}</th>
                            <th>{t('th_otp')}</th>
                            {isAdmin && <th>{t('th_in_tokens')}</th>}
                            {isAdmin && <th>{t('th_out_tokens')}</th>}
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
                                <td>
                                    {event.otp_status === 'success' && 'Success'}
                                    {event.otp_status === 'failed' && 'Failed'}
                                    {event.otp_status === 'unconfirmed' && 'Unconfirmed'}
                                    {event.otp_status === 'not_sent' && 'Not Sent'}
                                    {!['success', 'failed', 'unconfirmed', 'not_sent'].includes(event.otp_status || '') && (event.otp_status || '-')}
                                </td>
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
