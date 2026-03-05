'use client';

import { useState } from 'react';
import type { FilterState } from "@/lib/analytics";
import { useI18n } from "./I18nProvider";
import { useRouter } from "next/navigation";

type FilterBarProps = {
  basePath: string;
  filters: FilterState;
  channels: string[];
  categories: string[];
};

function getPresetDates(preset: string): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const toStr = toLocal(now);
  let fromDate: Date;

  switch (preset) {
    case 'today':
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      break;
    case 'yesterday':
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      return { from: toLocal(fromDate), to: toLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)) };
    case 'last_7':
      fromDate = new Date(now.getTime() - 7 * 86400000);
      break;
    case 'last_30':
      fromDate = new Date(now.getTime() - 30 * 86400000);
      break;
    case 'this_month':
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      break;
    default:
      fromDate = new Date(now.getTime() - 7 * 86400000);
  }

  return { from: toLocal(fromDate), to: toStr };
}

const presetConfig = [
  { key: 'today', icon: '📅', color: '#3b82f6' },
  { key: 'yesterday', icon: '⏪', color: '#8b5cf6' },
  { key: 'last_7', icon: '📊', color: '#06b6d4' },
  { key: 'last_30', icon: '📈', color: '#10b981' },
  { key: 'this_month', icon: '🗓️', color: '#f59e0b' },
] as const;

export function FilterBar({ basePath, filters, channels, categories }: FilterBarProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyPreset = (preset: string) => {
    setActivePreset(preset);
    const { from, to } = getPresetDates(preset);
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    router.push(`${basePath}?${params.toString()}`);
  };

  const activeFiltersCount = (filters.channels.length < channels.length ? 1 : 0) +
    (filters.categories.length < categories.length ? 1 : 0);

  return (
    <div style={{ marginBottom: 24 }}>
      {/* ─── Top Bar: Presets + Expand toggle ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}>
        {/* Presets */}
        <div style={{
          display: 'flex',
          gap: 6,
          flex: 1,
          flexWrap: 'wrap',
        }}>
          {presetConfig.map(({ key, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 500,
                border: `1px solid ${activePreset === key ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-sm)',
                background: activePreset === key ? 'var(--accent-blue-glow)' : 'var(--bg-card)',
                color: activePreset === key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>{icon}</span>
              {t(key === 'yesterday' ? 'yesterday' : key)}
            </button>
          ))}
        </div>

        {/* Expand / Collapse */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            background: expanded ? 'var(--accent-blue-glow)' : 'var(--bg-card)',
            color: expanded ? 'var(--accent-blue)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {t('advanced_filters') || 'Filters'}
          {activeFiltersCount > 0 && (
            <span style={{
              background: 'var(--accent-blue)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 99,
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {activeFiltersCount}
            </span>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: 'transform 0.2s ease', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* ─── Expanded Filter Panel ─── */}
      <div style={{
        maxHeight: expanded ? 600 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
        opacity: expanded ? 1 : 0,
      }}>
        <form method="GET" action={basePath} style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}>
          {/* Date range */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-highlight)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📅 {t('date_range') || 'Date Range'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end' }}>
              <div>
                <label className="small-label">{t('from')}</label>
                <input type="datetime-local" name="from" defaultValue={filters.fromLocal} className="input-dark" />
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40,
                borderRadius: '50%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 2,
              }}>→</div>
              <div>
                <label className="small-label">{t('to')}</label>
                <input type="datetime-local" name="to" defaultValue={filters.toLocal} className="input-dark" />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border-color)', margin: '0 0 20px' }} />

          {/* Channels + Categories side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Channels */}
            {channels.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-highlight)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    📡 {t('channels')}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    ({filters.channels.length}/{channels.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {channels.map((channel) => {
                    const checked = filters.channels.includes(channel);
                    return (
                      <label key={channel} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px',
                        borderRadius: 99,
                        border: `1px solid ${checked ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                        background: checked ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-surface)',
                        color: checked ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        fontSize: 13, fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}>
                        <input
                          type="checkbox" name="channel" value={channel}
                          defaultChecked={checked}
                          style={{ display: 'none' }}
                        />
                        <span style={{
                          width: 16, height: 16, borderRadius: 4,
                          border: `2px solid ${checked ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                          background: checked ? 'var(--accent-cyan)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}>
                          {checked && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        {channel}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-highlight)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    📂 {t('categories')}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    ({filters.categories.length}/{categories.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {categories.map((category) => {
                    const checked = filters.categories.includes(category);
                    return (
                      <label key={category} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px',
                        borderRadius: 99,
                        border: `1px solid ${checked ? 'var(--accent-purple)' : 'var(--border-color)'}`,
                        background: checked ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-surface)',
                        color: checked ? 'var(--accent-purple)' : 'var(--text-secondary)',
                        fontSize: 13, fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}>
                        <input
                          type="checkbox" name="category" value={category}
                          defaultChecked={checked}
                          style={{ display: 'none' }}
                        />
                        <span style={{
                          width: 16, height: 16, borderRadius: 4,
                          border: `2px solid ${checked ? 'var(--accent-purple)' : 'var(--border-color)'}`,
                          background: checked ? 'var(--accent-purple)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}>
                          {checked && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        {category}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border-color)', margin: '20px 0' }} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <a href={basePath} style={{
              padding: '10px 20px',
              fontSize: 13, fontWeight: 500,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}>
              🔄 {t('reset')}
            </a>
            <button type="submit" style={{
              padding: '10px 24px',
              fontSize: 13, fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              color: '#fff',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s ease',
            }}>
              ✨ {t('apply')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
