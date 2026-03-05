'use client';

import { ChartCard, TrendAreaChart, GroupedBarChart, DonutChart, MultiAreaChart } from './Charts';
import { useI18n } from './I18nProvider';

interface DashboardChartsProps {
    messageTrendData: { name: string; inbound: number; outbound: number }[];
    conversationTrendData: { name: string; value: number }[];
    tokenTrendData: { name: string; input: number; output: number }[];
    otpTrendData: { name: string; Requested: number; Success: number; Failed: number; Unconfirmed: number; NotSent: number }[];
    otpDonutData: { name: string; value: number; color: string }[];
    escalationTrendData: { name: string; value: number }[];
    costTrendData: { name: string; input: number; output: number; total: number }[];
    showTokenCostCharts?: boolean;
}

export function DashboardCharts({
    messageTrendData,
    conversationTrendData,
    tokenTrendData,
    otpTrendData,
    otpDonutData,
    escalationTrendData,
    costTrendData,
    showTokenCostCharts = true,
}: DashboardChartsProps) {
    const { t } = useI18n();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
            {/* Row 1: Messages + Conversations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                <ChartCard title={t('chart_msg_volume')} subtitle="User vs AI messages over time">
                    <GroupedBarChart
                        data={messageTrendData}
                        bars={[
                            { key: 'inbound', color: '#3b82f6', label: 'Inbound' },
                            { key: 'outbound', color: '#10b981', label: 'Outbound' },
                        ]}
                    />
                </ChartCard>
                <ChartCard title={t('chart_conv_trend')} subtitle="New conversations in selected period">
                    <TrendAreaChart data={conversationTrendData} color="#06b6d4" label="Conversations" />
                </ChartCard>
            </div>

            {/* Row 2: OTP + Escalations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                <ChartCard title={t('chart_auto_outcomes')} subtitle="Request, success, failed, unconfirmed, not sent">
                    <GroupedBarChart
                        data={otpTrendData}
                        bars={[
                            { key: 'Requested', color: '#f59e0b', label: 'Requested' },
                            { key: 'Success', color: '#10b981', label: 'Success' },
                            { key: 'Failed', color: '#f43f5e', label: 'Failed' },
                            { key: 'Unconfirmed', color: '#8b5cf6', label: 'Unconfirmed' },
                            { key: 'NotSent', color: '#64748b', label: 'Not Sent' },
                        ]}
                    />
                </ChartCard>
                <ChartCard title={t('chart_esc_trend')} subtitle="Human handoff events over time">
                    <TrendAreaChart data={escalationTrendData} color="#f43f5e" label="Escalations" />
                </ChartCard>
            </div>

            {/* Row 3: Token Usage + OTP Donut — token chart admin only */}
            <div style={{ display: 'grid', gridTemplateColumns: showTokenCostCharts ? 'minmax(0, 2fr) minmax(0, 1fr)' : '1fr', gap: '20px' }}>
                {showTokenCostCharts && (
                    <ChartCard title={t('chart_token_usage')} subtitle="Input vs Output tokens consumed">
                        <GroupedBarChart
                            data={tokenTrendData}
                            bars={[
                                { key: 'input', color: '#06b6d4', label: 'Input Tokens' },
                                { key: 'output', color: '#8b5cf6', label: 'Output Tokens' },
                            ]}
                        />
                    </ChartCard>
                )}
                <ChartCard title={t('chart_auto_dist')} subtitle="Overall success rate">
                    <DonutChart data={otpDonutData} />
                </ChartCard>
            </div>

            {/* Row 4: Cost Trend — admin only */}
            {showTokenCostCharts && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                    <ChartCard title={t('chart_llm_cost')} subtitle="Input, output, and total spend over time">
                        <MultiAreaChart
                            data={costTrendData}
                            areas={[
                                { key: 'input', color: '#06b6d4', label: 'Input Cost' },
                                { key: 'output', color: '#10b981', label: 'Output Cost' },
                                { key: 'total', color: '#f59e0b', label: 'Total Cost' },
                            ]}
                        />
                    </ChartCard>
                </div>
            )}
        </div>
    );
}
