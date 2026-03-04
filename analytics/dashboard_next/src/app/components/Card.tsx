interface KpiCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: {
        value: string;
        positive: boolean;
    };
    accentColor: 'blue' | 'purple' | 'emerald' | 'rose' | 'amber' | 'cyan';
}

const accentMap = {
    blue: { glow: 'glow-blue', color: 'var(--accent-blue)', bg: 'var(--accent-blue-glow)' },
    purple: { glow: 'glow-purple', color: 'var(--accent-purple)', bg: 'var(--accent-purple-glow)' },
    emerald: { glow: 'glow-emerald', color: 'var(--accent-emerald)', bg: 'var(--accent-emerald-glow)' },
    rose: { glow: 'glow-rose', color: 'var(--accent-rose)', bg: 'var(--accent-rose-glow)' },
    amber: { glow: 'glow-amber', color: 'var(--accent-amber)', bg: 'var(--accent-amber-glow)' },
    cyan: { glow: 'glow-cyan', color: 'var(--accent-cyan)', bg: 'var(--accent-cyan-glow)' },
};

export function KpiCard({ title, value, subtitle, icon, trend, accentColor }: KpiCardProps) {
    const accent = accentMap[accentColor];

    return (
        <div className={`glass-card ${accent.glow}`}
            style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}
        >
            {/* Accent gradient overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '120px',
                height: '120px',
                background: `radial-gradient(circle at top right, ${accent.bg}, transparent 70%)`,
                pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: accent.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: accent.color,
                }}>
                    {icon}
                </div>
                {trend && (
                    <span
                        className={trend.positive ? 'badge-success' : 'badge-danger'}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            padding: '3px 8px',
                            borderRadius: '99px',
                            fontSize: '12px',
                            fontWeight: 600,
                        }}
                    >
                        {trend.positive ? '+' : '-'} {trend.value}
                    </span>
                )}
            </div>

            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px' }}>
                {title}
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-highlight)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {value}
            </div>
            {subtitle && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {subtitle}
                </div>
            )}
        </div>
    );
}

