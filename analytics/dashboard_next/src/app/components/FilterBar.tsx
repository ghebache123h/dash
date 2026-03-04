import type { FilterState } from "@/lib/analytics";

type FilterBarProps = {
  basePath: string;
  filters: FilterState;
  channels: string[];
  categories: string[];
};

export function FilterBar({ basePath, filters, channels, categories }: FilterBarProps) {
  return (
    <form method="GET" action={basePath} className="glass-card" style={{ padding: "20px", marginBottom: "20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          alignItems: "end",
        }}
      >
        <div>
          <label className="small-label">From</label>
          <input type="datetime-local" name="from" defaultValue={filters.fromLocal} className="input-dark" />
        </div>
        <div>
          <label className="small-label">To</label>
          <input type="datetime-local" name="to" defaultValue={filters.toLocal} className="input-dark" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="small-label">Channels</label>
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
          <label className="small-label">Categories</label>
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
          Apply Filters
        </button>
        <a href={basePath} className="btn-secondary" style={{ textDecoration: "none" }}>
          Reset
        </a>
      </div>
    </form>
  );
}
