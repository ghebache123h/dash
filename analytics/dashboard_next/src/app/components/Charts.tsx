'use client';

import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = {
    blue: '#3b82f6',
    purple: '#8b5cf6',
    emerald: '#10b981',
    rose: '#f43f5e',
    amber: '#f59e0b',
    cyan: '#06b6d4',
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
        <div style={{
            background: '#1a1f2e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{label}</div>
            {payload.map((entry: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f1f5f9' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: entry.color }} />
                    <span style={{ color: '#94a3b8' }}>{entry.name}:</span>
                    <span style={{ fontWeight: 600 }}>{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
                </div>
            ))}
        </div>
    );
};

interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    height?: number;
}

export function ChartCard({ title, subtitle, children, height = 280 }: ChartCardProps) {
    return (
        <div className="chart-container">
            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-highlight)', margin: 0 }}>
                    {title}
                </h3>
                {subtitle && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>{subtitle}</p>
                )}
            </div>
            <div style={{ width: '100%', height }}>
                {children}
            </div>
        </div>
    );
}

// --- Chart Components ---

interface TrendChartProps {
    data: { name: string; value: number }[];
    color?: string;
    label?: string;
}

export function TrendAreaChart({ data, color = COLORS.blue, label = 'Count' }: TrendChartProps) {
    if (!data.length) return <EmptyChart />;
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <defs>
                    <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={2} fill={`url(#grad-${color.replace('#', '')})`} dot={false} activeDot={{ r: 4, fill: color, stroke: '#1a1f2e', strokeWidth: 2 }} />
            </AreaChart>
        </ResponsiveContainer>
    );
}

interface MultiBarData {
    name: string;
    [key: string]: string | number;
}
interface MultiBarProps {
    data: MultiBarData[];
    bars: { key: string; color: string; label: string }[];
}

export function GroupedBarChart({ data, bars }: MultiBarProps) {
    if (!data.length) return <EmptyChart />;
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '12px' }}
                    iconType="square"
                    iconSize={10}
                />
                {bars.map((bar) => (
                    <Bar key={bar.key} dataKey={bar.key} name={bar.label} fill={bar.color} radius={[4, 4, 0, 0]} maxBarSize={32} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}

interface DonutData {
    name: string;
    value: number;
    color: string;
}
export function DonutChart({ data }: { data: DonutData[] }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (!total) return <EmptyChart />;
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                >
                    {data.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                    iconType="circle"
                    iconSize={8}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

function EmptyChart() {
    return (
        <div className="empty-state" style={{ height: '100%' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3v18h18" /><path d="m7 16 4-8 4 4 5-6" />
            </svg>
            <div style={{ fontSize: '13px' }}>No data available yet</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>Data will appear once tracking events are received</div>
        </div>
    );
}
