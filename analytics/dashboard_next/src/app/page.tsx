import { DashboardCharts } from "./components/DashboardCharts";
import { KpiCard } from "./components/Card";
import { CostSection } from "./components/CostSection";
import { FilterBar } from "./components/FilterBar";
import { DashboardWrapper } from "./components/DashboardWrapper";
import { getDashboardData, getFilterOptions, parseFilters } from "@/lib/analytics";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function trendValue(current: number, previous: number): string {
  const delta = current - previous;
  if (Number.isNaN(delta)) {
    return "0";
  }
  if (Math.abs(delta) < 0.000001) {
    return "0";
  }
  const rounded = Number.isInteger(delta) ? delta.toString() : delta.toFixed(2);
  return `${delta > 0 ? "+" : ""}${rounded}`;
}

function trendPositive(current: number, previous: number, inverse = false): boolean {
  const delta = current - previous;
  if (delta === 0) {
    return true;
  }
  if (inverse) {
    return delta < 0;
  }
  return delta > 0;
}

function eventLabel(value: string): string {
  const map: Record<string, string> = {
    inbound_message: "Inbound message",
    outbound_message: "Outbound message",
    conversation_created: "Conversation created",
    otp_request: "OTP request",
    otp_outcome: "OTP outcome",
    support_escalation: "Support escalation",
    ai_usage: "AI usage",
    intent_classification: "Intent classification",
  };
  return map[value] || value;
}

function safeLocaleDate(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolvedParams = (await Promise.resolve(searchParams ?? {})) as SearchParams;
  const options = await getFilterOptions();
  const filters = parseFilters(resolvedParams, options.channels, options.categories);
  const data = await getDashboardData(filters);

  return (
    <DashboardWrapper
      costSection={
        <CostSection
          inputTokens={data.kpis.inputTokensTotal}
          outputTokens={data.kpis.outputTokensTotal}
          inputCost={data.kpis.inputCost}
          outputCost={data.kpis.outputCost}
          totalCost={data.kpis.totalCost}
          inPricePerM={data.pricing.input_price_per_million}
          outPricePerM={data.pricing.output_price_per_million}
        />
      }
    >
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
            Dashboard Overview
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px" }}>
            Real-time analytics with period-over-period comparison. Bucket: {data.bucketLabel}
          </p>
        </header>

        <FilterBar basePath="/" filters={filters} channels={options.channels} categories={options.categories} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          <KpiCard
            title="Total Messages"
            value={data.kpis.totalMessages.toLocaleString()}
            subtitle="Inbound + outbound"
            tooltip="Total count of inbound + outbound messages in the selected period."
            accentColor="blue"
            trend={{
              value: trendValue(data.kpis.totalMessages, data.prevKpis.totalMessages),
              positive: trendPositive(data.kpis.totalMessages, data.prevKpis.totalMessages),
            }}
            icon={<span>M</span>}
          />
          <KpiCard
            title="New Conversations"
            value={data.kpis.newConversations.toLocaleString()}
            subtitle="First inbound in range"
            accentColor="purple"
            trend={{
              value: trendValue(data.kpis.newConversations, data.prevKpis.newConversations),
              positive: trendPositive(data.kpis.newConversations, data.prevKpis.newConversations),
            }}
            icon={<span>C</span>}
          />
          <KpiCard
            title="Disney Customers"
            value={data.kpis.disneyCustomers.toLocaleString()}
            subtitle="Unique inbound disney"
            tooltip="Unique customers who sent inbound disney-related messages."
            accentColor="cyan"
            trend={{
              value: trendValue(data.kpis.disneyCustomers, data.prevKpis.disneyCustomers),
              positive: trendPositive(data.kpis.disneyCustomers, data.prevKpis.disneyCustomers),
            }}
            icon={<span>D</span>}
          />
          <KpiCard
            title="Disney Code Requests"
            value={data.kpis.disneyCodeRequests.toLocaleString()}
            subtitle="OTP request events"
            tooltip="Total OTP request events in the period."
            accentColor="amber"
            trend={{
              value: trendValue(data.kpis.disneyCodeRequests, data.prevKpis.disneyCodeRequests),
              positive: trendPositive(data.kpis.disneyCodeRequests, data.prevKpis.disneyCodeRequests),
            }}
            icon={<span>R</span>}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <KpiCard
            title="OTP Success"
            value={data.kpis.otpSuccessCount.toLocaleString()}
            subtitle={`Failed: ${data.kpis.otpFailedCount.toLocaleString()} | Unconfirmed: ${data.kpis.otpUnconfirmedCount.toLocaleString()} | Not Sent: ${data.kpis.otpNotSentCount.toLocaleString()}`}
            tooltip="OTP verified successfully by the customer."
            accentColor="emerald"
            trend={{
              value: trendValue(data.kpis.otpSuccessCount, data.prevKpis.otpSuccessCount),
              positive: trendPositive(data.kpis.otpSuccessCount, data.prevKpis.otpSuccessCount),
            }}
            icon={<span>S</span>}
          />
          <KpiCard
            title="Escalations"
            value={data.kpis.supportEscalationCount.toLocaleString()}
            subtitle="Human handoff events"
            tooltip="Conversations transferred to a human support agent."
            accentColor="rose"
            trend={{
              value: trendValue(data.kpis.supportEscalationCount, data.prevKpis.supportEscalationCount),
              positive: trendPositive(data.kpis.supportEscalationCount, data.prevKpis.supportEscalationCount, true),
            }}
            icon={<span>E</span>}
          />
          <KpiCard
            title="Avg Msg / Conversation"
            value={data.kpis.avgMessagesPerConversation.toFixed(2)}
            subtitle="Conversation density"
            accentColor="blue"
            trend={{
              value: trendValue(data.kpis.avgMessagesPerConversation, data.prevKpis.avgMessagesPerConversation),
              positive: trendPositive(data.kpis.avgMessagesPerConversation, data.prevKpis.avgMessagesPerConversation),
            }}
            icon={<span>A</span>}
          />
          <KpiCard
            title="Token Totals"
            value={(data.kpis.inputTokensTotal + data.kpis.outputTokensTotal).toLocaleString()}
            subtitle={`In ${data.kpis.inputTokensTotal.toLocaleString()} | Out ${data.kpis.outputTokensTotal.toLocaleString()}`}
            tooltip="Combined input + output token count from AI responses."
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
        </div>

        <DashboardCharts
          messageTrendData={data.messageTrendData}
          conversationTrendData={data.conversationTrendData}
          tokenTrendData={data.tokenTrendData}
          otpTrendData={data.otpTrendData}
          otpDonutData={data.otpDonutData}
          escalationTrendData={data.escalationTrendData}
          costTrendData={data.costTrendData}
        />

        <div className="glass-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "20px 20px 10px" }}>
            <h2 style={{ margin: 0, fontSize: "18px", color: "var(--text-highlight)" }}>Recent Events</h2>
            <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: "13px" }}>Latest 200 events in selected range</p>
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
                <th>In tokens</th>
                <th>Out tokens</th>
              </tr>
            </thead>
            <tbody>
              {data.recentEvents.map((event, idx) => (
                <tr key={`${event.event_key}-${idx}`}>
                  <td>{safeLocaleDate(event.event_time)}</td>
                  <td>{eventLabel(event.event_type)}</td>
                  <td>{event.conversation_id || "-"}</td>
                  <td>{event.customer_id || "-"}</td>
                  <td>{event.category || "-"}</td>
                  <td>{event.intent || "-"}</td>
                  <td>{event.otp_status || "-"}</td>
                  <td>{Number(event.token_input || 0).toLocaleString()}</td>
                  <td>{Number(event.token_output || 0).toLocaleString()}</td>
                </tr>
              ))}
              {data.recentEvents.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    No events for selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardWrapper>
  );
}
