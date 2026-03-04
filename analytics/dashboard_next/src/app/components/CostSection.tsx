interface CostSectionProps {
    inputTokens: number;
    outputTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
    inPricePerM: number;
    outPricePerM: number;
}

export function CostSection({
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost,
    inPricePerM,
    outPricePerM,
}: CostSectionProps) {
    return (
        <div className="glass-card" style={{ padding: '28px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-highlight)', margin: 0 }}>
                        Cost & Token Summary
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        Pricing: ${inPricePerM}/M input | ${outPricePerM}/M output
                    </p>
                </div>
                <a href="/settings" style={{
                    fontSize: '13px',
                    color: 'var(--accent-blue)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                }}>
                    {"Configure Pricing ->"}
                </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                {/* Input Tokens */}
                <div style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    border: '1px solid var(--border-color)',
                }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                        Input Tokens
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-highlight)' }}>
                        {inputTokens.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        ${inputCost.toFixed(4)} cost
                    </div>
                </div>

                {/* Output Tokens */}
                <div style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    border: '1px solid var(--border-color)',
                }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-purple)', marginBottom: '8px' }}>
                        Output Tokens
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-highlight)' }}>
                        {outputTokens.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        ${outputCost.toFixed(4)} cost
                    </div>
                </div>

                {/* Total Tokens */}
                <div style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    border: '1px solid var(--border-color)',
                }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Total Tokens
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-highlight)' }}>
                        {(inputTokens + outputTokens).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Combined usage
                    </div>
                </div>

                {/* Total Cost (Hero) */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(139, 92, 246, 0.08))',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-amber)', marginBottom: '8px' }}>
                        Estimated Total Cost
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                        ${totalCost.toFixed(4)}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        All-time LLM spend
                    </div>
                </div>
            </div>
        </div>
    );
}
