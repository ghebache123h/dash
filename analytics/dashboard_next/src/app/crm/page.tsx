import { FilterBar } from "../components/FilterBar";
import { getDashboardData, getFilterOptions, parseFilters } from "@/lib/analytics";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function safeLocaleDate(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolvedParams = (await Promise.resolve(searchParams ?? {})) as SearchParams;
  const options = await getFilterOptions();
  const filters = parseFilters(resolvedParams, options.channels, options.categories);
  const data = await getDashboardData(filters);

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
          Escalation Monitor
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px" }}>
          CRM-style view for support handoff and repeated escalation patterns
        </p>
      </header>

      <FilterBar basePath="/crm" filters={filters} channels={options.channels} categories={options.categories} />

      <div className="glass-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "20px" }}>
          <span className="badge badge-danger" style={{ fontSize: "12px" }}>
            {data.escalationRows.length} escalated conversation{data.escalationRows.length === 1 ? "" : "s"}
          </span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Conversation</th>
              <th>Escalation Count</th>
              <th>Reason</th>
              <th>First Escalation</th>
              <th>Last Escalation</th>
              <th>Pattern</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {data.escalationRows.map((row) => (
              <tr key={`${row.customerId}-${row.conversationId}`}>
                <td>{row.customerId}</td>
                <td>{row.conversationId}</td>
                <td>{row.escalationCount}</td>
                <td>{row.escalationReason}</td>
                <td>{safeLocaleDate(row.firstEscalationAt)}</td>
                <td>{safeLocaleDate(row.lastEscalationAt)}</td>
                <td>{row.repeated ? "Repeated" : "Single"}</td>
                <td>
                  {row.conversationReference ? (
                    <a href={row.conversationReference} target="_blank" rel="noreferrer" style={{ color: "var(--accent-blue)" }}>
                      Open
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
                  No escalations in selected range
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
