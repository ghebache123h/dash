'use client';

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

export function FilterBar({ basePath, filters, channels, categories }: FilterBarProps) {
  const { t } = useI18n();
  const router = useRouter();

  const applyPreset = (preset: string) => {
    const { from, to } = getPresetDates(preset);
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Quick presets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span className="small-label" style={{ alignSelf: 'center', marginBottom: 0, marginRight: 4 }}>{t('presets')}</span>
        {(['today', 'last_7', 'last_30', 'this_month'] as const).map(preset => (
          <button
            key={preset}
            type="button"
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: 12 }}
            onClick={() => applyPreset(preset)}
          >
            {t(preset)}
          </button>
        ))}
      </div>

      <form method="GET" action={basePath} className="glass-card" style={{ padding: "20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            alignItems: "end",
          }}
        >
          <div>
            <label className="small-label">{t('from')}</label>
            <input type="datetime-local" name="from" defaultValue={filters.fromLocal} className="input-dark" />
          </div>
          <div>
            <label className="small-label">{t('to')}</label>
            <input type="datetime-local" name="to" defaultValue={filters.toLocal} className="input-dark" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="small-label">{t('channels')}</label>
            <div className="option-grid">
              {channels.map((channel) => (
                <label key={channel} className="option-chip">
                  <input
                    type="checkbox"
                    name="channel"
                    value={channel}
                    defaultChecked={filters.channels.includes(channel)}
                    style={{ margin: 0 }}
                  />
                  <span>{channel}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="small-label">{t('categories')}</label>
            <div className="option-grid">
              {categories.map((category) => (
                <label key={category} className="option-chip">
                  <input
                    type="checkbox"
                    name="category"
                    value={category}
                    defaultChecked={filters.categories.includes(category)}
                    style={{ margin: 0 }}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button type="submit" className="btn-primary">
            {t('apply')}
          </button>
          <a href={basePath} className="btn-secondary" style={{ textDecoration: "none" }}>
            {t('reset')}
          </a>
        </div>
      </form>
    </div>
  );
}
