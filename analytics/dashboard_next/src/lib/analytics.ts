import { format, parseISO } from "date-fns";
import { query } from "./db";

export type FilterState = {
  from: Date;
  to: Date;
  fromLocal: string;
  toLocal: string;
  channels: string[];
  categories: string[];
};

export type EventRow = {
  event_time: string | Date;
  event_type: string;
  conversation_id: string | null;
  customer_id: string | null;
  channel: string | null;
  direction: string | null;
  category: string | null;
  intent: string | null;
  otp_status: string | null;
  escalation_reason: string | null;
  token_input: number;
  token_output: number;
  metadata: Record<string, unknown> | null;
  event_key: string;
};

export type PricingRow = {
  input_price_per_million: number;
  output_price_per_million: number;
};

export type DashboardKpis = {
  totalMessages: number;
  newConversations: number;
  disneyCustomers: number;
  disneyCodeRequests: number;
  otpSuccessCount: number;
  otpFailedCount: number;
  otpUnconfirmedCount: number;
  otpNotSentCount: number;
  supportEscalationCount: number;
  avgMessagesPerConversation: number;
  inputTokensTotal: number;
  outputTokensTotal: number;
  avgInputTokensPerConversation: number;
  avgOutputTokensPerConversation: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
};

export type DashboardData = {
  pricing: PricingRow;
  kpis: DashboardKpis;
  prevKpis: DashboardKpis;
  bucketLabel: string;
  messageTrendData: { name: string; inbound: number; outbound: number }[];
  conversationTrendData: { name: string; value: number }[];
  tokenTrendData: { name: string; input: number; output: number }[];
  otpTrendData: { name: string; Requested: number; Success: number; Failed: number; Unconfirmed: number; NotSent: number }[];
  otpDonutData: { name: string; value: number; color: string }[];
  escalationTrendData: { name: string; value: number }[];
  costTrendData: { name: string; input: number; output: number; total: number }[];
  escalationRows: Array<{
    customerId: string;
    conversationId: string;
    escalationCount: number;
    escalationReason: string;
    firstEscalationAt: Date;
    lastEscalationAt: Date;
    repeated: boolean;
    conversationReference: string;
  }>;
  otpPerUserRows: Array<{
    customerId: string;
    requested: number;
    success: number;
    failed: number;
    unconfirmed: number;
    notSent: number;
    total: number;
    successRate: number;
    conversationUrl: string;
  }>;
  tokensPerConversationRows: Array<{
    conversationId: string;
    customerId: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    messageCount: number;
  }>;
  recentEvents: EventRow[];
};

function toDate(value: string | Date | null | undefined, fallback: Date): Date {
  if (!value) {
    return fallback;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return fallback;
    }
    return value;
  }
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed;
}

export function datetimeLocalValue(value: Date): string {
  return format(value, "yyyy-MM-dd'T'HH:mm");
}

function parseDateParam(value: string | string[] | undefined, fallback: Date): Date {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return fallback;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed;
}

function parseListParam(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  const rawValues = Array.isArray(value) ? value : [value];
  return rawValues
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function parseFilters(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  availableChannels: string[],
  availableCategories: string[],
): FilterState {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const params = searchParams ?? {};

  const from = parseDateParam(params.from, defaultFrom);
  const to = parseDateParam(params.to, now);
  const fixedTo = to <= from ? new Date(from.getTime() + 60 * 60 * 1000) : to;

  const requestedChannels = parseListParam(params.channel);
  const requestedCategories = parseListParam(params.category);

  const channels = requestedChannels.length
    ? requestedChannels.filter((item) => availableChannels.includes(item))
    : availableChannels;
  const categories = requestedCategories.length
    ? requestedCategories.filter((item) => availableCategories.includes(item))
    : availableCategories;

  return {
    from,
    to: fixedTo,
    fromLocal: datetimeLocalValue(from),
    toLocal: datetimeLocalValue(fixedTo),
    channels,
    categories,
  };
}

type RawEventRow = Omit<EventRow, "event_time" | "token_input" | "token_output"> & {
  event_time: Date;
  token_input: number | string;
  token_output: number | string;
};

export async function getFilterOptions(): Promise<{ channels: string[]; categories: string[] }> {
  const channelsRows = await query<{ value: string }>(
    "SELECT DISTINCT channel AS value FROM analytics_events WHERE channel IS NOT NULL AND channel <> '' ORDER BY 1",
  );
  const categoriesRows = await query<{ value: string }>(
    "SELECT DISTINCT category AS value FROM analytics_events WHERE category IS NOT NULL AND category <> '' ORDER BY 1",
  );

  return {
    channels: channelsRows.map((row) => row.value),
    categories: categoriesRows.map((row) => row.value),
  };
}

function buildWhere(
  from: Date,
  to: Date,
  channels: string[],
  categories: string[],
  startingParamIndex = 1,
): { clause: string; params: unknown[] } {
  const params: unknown[] = [from.toISOString(), to.toISOString()];
  const pieces = [`event_time >= $${startingParamIndex}`, `event_time <= $${startingParamIndex + 1}`];
  let nextIndex = startingParamIndex + 2;

  if (channels.length > 0) {
    pieces.push(`channel = ANY($${nextIndex})`);
    params.push(channels);
    nextIndex += 1;
  }

  if (categories.length > 0) {
    pieces.push(`category = ANY($${nextIndex})`);
    params.push(categories);
  }

  return {
    clause: pieces.join(" AND "),
    params,
  };
}

export async function getPricing(): Promise<PricingRow> {
  const rows = await query<PricingRow>(
    "SELECT input_price_per_million, output_price_per_million FROM pricing_settings WHERE id = 1",
  );
  if (rows.length === 0) {
    return { input_price_per_million: 0, output_price_per_million: 0 };
  }
  return {
    input_price_per_million: Number(rows[0].input_price_per_million || 0),
    output_price_per_million: Number(rows[0].output_price_per_million || 0),
  };
}

export async function updatePricing(input: number, output: number): Promise<void> {
  await query(
    `
      INSERT INTO pricing_settings (id, input_price_per_million, output_price_per_million, updated_at)
      VALUES (1, $1, $2, NOW())
      ON CONFLICT (id) DO UPDATE
      SET
        input_price_per_million = EXCLUDED.input_price_per_million,
        output_price_per_million = EXCLUDED.output_price_per_million,
        updated_at = NOW()
    `,
    [input, output],
  );
}

async function fetchEvents(from: Date, to: Date, channels: string[], categories: string[]): Promise<EventRow[]> {
  const where = buildWhere(from, to, channels, categories);
  const rows = await query<RawEventRow>(
    `
      SELECT
        event_time, event_type, conversation_id, customer_id, channel, direction, category,
        intent, otp_status, escalation_reason, token_input, token_output, metadata, event_key
      FROM analytics_events
      WHERE ${where.clause}
      ORDER BY event_time ASC
    `,
    where.params,
  );

  return rows.map((row) => {
    let tokenIn = Number(row.token_input || 0);
    let tokenOut = Number(row.token_output || 0);
    const meta = row.metadata ?? {};

    // Fallback: if top-level tokens are 0 but metadata has total_tokens, use that
    if (tokenIn === 0 && tokenOut === 0 && meta.total_tokens) {
      const total = Number(meta.total_tokens);
      // Use metadata breakdown if available, otherwise estimate 80/20 split
      tokenIn = Number(meta.prompt_tokens || meta.input_tokens || Math.round(total * 0.8));
      tokenOut = Number(meta.completion_tokens || meta.output_tokens || total - tokenIn);
    }

    return {
      ...row,
      event_time: row.event_time,
      token_input: tokenIn,
      token_output: tokenOut,
      metadata: meta,
    };
  });
}

async function fetchAllInbound(channels: string[], categories: string[]): Promise<EventRow[]> {
  const params: unknown[] = [];
  const clauses = ["event_type = 'inbound_message'", "conversation_id IS NOT NULL"];
  let idx = 1;

  if (channels.length > 0) {
    clauses.push(`channel = ANY($${idx})`);
    params.push(channels);
    idx += 1;
  }
  if (categories.length > 0) {
    clauses.push(`category = ANY($${idx})`);
    params.push(categories);
  }

  const rows = await query<RawEventRow>(
    `
      SELECT
        event_time, event_type, conversation_id, customer_id, channel, direction, category,
        intent, otp_status, escalation_reason, token_input, token_output, metadata, event_key
      FROM analytics_events
      WHERE ${clauses.join(" AND ")}
      ORDER BY event_time ASC
    `,
    params,
  );

  return rows.map((row) => ({
    ...row,
    token_input: Number(row.token_input || 0),
    token_output: Number(row.token_output || 0),
    metadata: row.metadata ?? {},
  }));
}

function computeKpis(
  events: EventRow[],
  allInbound: EventRow[],
  start: Date,
  end: Date,
  inputPrice: number,
  outputPrice: number,
): DashboardKpis {
  const firstInboundByConversation = new Map<string, Date>();
  for (const event of allInbound) {
    if (!event.conversation_id) {
      continue;
    }
    const time = toDate(event.event_time, new Date(0));
    const existing = firstInboundByConversation.get(event.conversation_id);
    if (!existing || time < existing) {
      firstInboundByConversation.set(event.conversation_id, time);
    }
  }

  let newConversations = 0;
  for (const firstTime of firstInboundByConversation.values()) {
    if (firstTime >= start && firstTime <= end) {
      newConversations += 1;
    }
  }

  const totalMessages = events.filter((event) => event.event_type === "inbound_message" || event.event_type === "outbound_message")
    .length;

  const disneyCustomerSet = new Set<string>();
  for (const event of events) {
    if (event.event_type === "inbound_message" && event.category === "disney") {
      disneyCustomerSet.add(event.customer_id || event.conversation_id || "unknown");
    }
  }

  const disneyCodeRequests = events.filter((event) => event.event_type === "otp_request").length;
  const otpSuccessCount = events.filter((event) => event.event_type === "otp_outcome" && event.otp_status === "success").length;
  const otpFailedCount = events.filter((event) => event.event_type === "otp_outcome" && event.otp_status === "failed").length;
  const otpUnconfirmedCount = events.filter(
    (event) => event.event_type === "otp_outcome" && event.otp_status === "unconfirmed",
  ).length;
  const otpNotSentCount = events.filter(
    (event) => event.event_type === "otp_outcome" && event.otp_status === "not_sent",
  ).length;
  const supportEscalationCount = events.filter((event) => event.event_type === "support_escalation").length;

  const conversationSet = new Set(events.map((event) => event.conversation_id).filter((id): id is string => Boolean(id)));
  const avgMessagesPerConversation = conversationSet.size > 0 ? Number((totalMessages / conversationSet.size).toFixed(2)) : 0;

  const inputTokensTotal = events.reduce((sum, event) => sum + Number(event.token_input || 0), 0);
  const outputTokensTotal = events.reduce((sum, event) => sum + Number(event.token_output || 0), 0);

  const inputConversationSet = new Set(
    events.filter((event) => Number(event.token_input || 0) > 0 && event.conversation_id).map((event) => event.conversation_id!),
  );
  const outputConversationSet = new Set(
    events.filter((event) => Number(event.token_output || 0) > 0 && event.conversation_id).map((event) => event.conversation_id!),
  );

  const avgInputTokensPerConversation =
    inputConversationSet.size > 0 ? Number((inputTokensTotal / inputConversationSet.size).toFixed(2)) : 0;
  const avgOutputTokensPerConversation =
    outputConversationSet.size > 0 ? Number((outputTokensTotal / outputConversationSet.size).toFixed(2)) : 0;

  const inputCost = (inputTokensTotal / 1_000_000) * inputPrice;
  const outputCost = (outputTokensTotal / 1_000_000) * outputPrice;
  const totalCost = inputCost + outputCost;

  return {
    totalMessages,
    newConversations,
    disneyCustomers: disneyCustomerSet.size,
    disneyCodeRequests,
    otpSuccessCount,
    otpFailedCount,
    otpUnconfirmedCount,
    otpNotSentCount,
    supportEscalationCount,
    avgMessagesPerConversation,
    inputTokensTotal,
    outputTokensTotal,
    avgInputTokensPerConversation,
    avgOutputTokensPerConversation,
    inputCost,
    outputCost,
    totalCost,
  };
}

type BucketType = "hour" | "day" | "week";

function inferBucket(start: Date, end: Date): { type: BucketType; label: string } {
  const ms = end.getTime() - start.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (ms <= 2 * dayMs) {
    return { type: "hour", label: "Hourly" };
  }
  if (ms <= 62 * dayMs) {
    return { type: "day", label: "Daily" };
  }
  return { type: "week", label: "Weekly" };
}

function bucketKey(date: Date, bucket: BucketType): string {
  if (bucket === "hour") {
    return format(date, "yyyy-MM-dd HH:00");
  }
  if (bucket === "day") {
    return format(date, "yyyy-MM-dd");
  }
  const day = date.getDay();
  const shift = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + shift);
  weekStart.setHours(0, 0, 0, 0);
  return format(weekStart, "yyyy-MM-dd");
}

function labelFromBucketKey(key: string, bucket: BucketType): string {
  const hourLike = key.includes(" ");
  const isoLike =
    bucket === "hour" && hourLike
      ? `${key.replace(" ", "T")}:00Z`
      : `${key}T00:00:00Z`;
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) {
    return key;
  }
  if (bucket === "hour") {
    return format(date, "MMM d HH:mm");
  }
  return format(date, "MMM d");
}

function groupByBucket(events: EventRow[], bucket: BucketType): Map<string, EventRow[]> {
  const map = new Map<string, EventRow[]>();
  for (const event of events) {
    const time = toDate(event.event_time, new Date(0));
    const key = bucketKey(time, bucket);
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }
  return map;
}

function buildEscalationRows(events: EventRow[]): DashboardData["escalationRows"] {
  const escalationEvents = events.filter((event) => event.event_type === "support_escalation");
  const grouped = new Map<string, DashboardData["escalationRows"][number]>();

  for (const event of escalationEvents) {
    const customerId = event.customer_id || "unknown";
    const conversationId = event.conversation_id || "unknown";
    const key = `${customerId}|${conversationId}`;
    const eventTime = toDate(event.event_time, new Date());
    const conversationReference = conversationId && conversationId !== "unknown"
      ? `https://app.chatwoot.com/app/accounts/152788/inbox-view/conversation/${conversationId}`
      : "";

    if (!grouped.has(key)) {
      grouped.set(key, {
        customerId,
        conversationId,
        escalationCount: 1,
        escalationReason: event.escalation_reason || "unspecified",
        firstEscalationAt: eventTime,
        lastEscalationAt: eventTime,
        repeated: false,
        conversationReference,
      });
      continue;
    }

    const row = grouped.get(key)!;
    row.escalationCount += 1;
    row.firstEscalationAt = eventTime < row.firstEscalationAt ? eventTime : row.firstEscalationAt;
    row.lastEscalationAt = eventTime > row.lastEscalationAt ? eventTime : row.lastEscalationAt;
    if (event.escalation_reason && !row.escalationReason.includes(event.escalation_reason)) {
      row.escalationReason = `${row.escalationReason}, ${event.escalation_reason}`;
    }
    if (!row.conversationReference && conversationReference) {
      row.conversationReference = conversationReference;
    }
    row.repeated = row.escalationCount > 1;
  }

  return Array.from(grouped.values()).sort((a, b) => b.lastEscalationAt.getTime() - a.lastEscalationAt.getTime());
}

export async function getDashboardData(filters: FilterState): Promise<DashboardData> {
  const pricing = await getPricing();
  const [events, allInbound] = await Promise.all([
    fetchEvents(filters.from, filters.to, filters.channels, filters.categories),
    fetchAllInbound(filters.channels, filters.categories),
  ]);

  const durationMs = filters.to.getTime() - filters.from.getTime();
  const prevStart = new Date(filters.from.getTime() - durationMs);
  const prevEnd = filters.from;
  const prevEvents = await fetchEvents(prevStart, prevEnd, filters.channels, filters.categories);

  const kpis = computeKpis(
    events,
    allInbound,
    filters.from,
    filters.to,
    pricing.input_price_per_million,
    pricing.output_price_per_million,
  );
  const prevKpis = computeKpis(
    prevEvents,
    allInbound,
    prevStart,
    prevEnd,
    pricing.input_price_per_million,
    pricing.output_price_per_million,
  );

  const bucketInfo = inferBucket(filters.from, filters.to);
  const groups = groupByBucket(events, bucketInfo.type);
  const sortedKeys = Array.from(groups.keys()).sort();

  const messageTrendData = sortedKeys.map((key) => {
    const list = groups.get(key) ?? [];
    return {
      name: labelFromBucketKey(key, bucketInfo.type),
      inbound: list.filter((event) => event.event_type === "inbound_message").length,
      outbound: list.filter((event) => event.event_type === "outbound_message").length,
    };
  });

  const tokenTrendData = sortedKeys.map((key) => {
    const list = groups.get(key) ?? [];
    return {
      name: labelFromBucketKey(key, bucketInfo.type),
      input: list.reduce((sum, event) => sum + Number(event.token_input || 0), 0),
      output: list.reduce((sum, event) => sum + Number(event.token_output || 0), 0),
    };
  });

  const otpTrendData = sortedKeys.map((key) => {
    const list = groups.get(key) ?? [];
    return {
      name: labelFromBucketKey(key, bucketInfo.type),
      Requested: list.filter((event) => event.event_type === "otp_request").length,
      Success: list.filter((event) => event.event_type === "otp_outcome" && event.otp_status === "success").length,
      Failed: list.filter((event) => event.event_type === "otp_outcome" && event.otp_status === "failed").length,
      Unconfirmed: list.filter((event) => event.event_type === "otp_outcome" && event.otp_status === "unconfirmed").length,
      NotSent: list.filter((event) => event.event_type === "otp_outcome" && event.otp_status === "not_sent").length,
    };
  });

  const escalationTrendData = sortedKeys.map((key) => {
    const list = groups.get(key) ?? [];
    return {
      name: labelFromBucketKey(key, bucketInfo.type),
      value: list.filter((event) => event.event_type === "support_escalation").length,
    };
  });

  const costTrendData = sortedKeys.map((key) => {
    const list = groups.get(key) ?? [];
    const inputTokens = list.reduce((sum, event) => sum + Number(event.token_input || 0), 0);
    const outputTokens = list.reduce((sum, event) => sum + Number(event.token_output || 0), 0);
    const input = (inputTokens / 1_000_000) * pricing.input_price_per_million;
    const output = (outputTokens / 1_000_000) * pricing.output_price_per_million;
    return {
      name: labelFromBucketKey(key, bucketInfo.type),
      input,
      output,
      total: input + output,
    };
  });

  const firstInboundByConversation = new Map<string, Date>();
  for (const event of allInbound) {
    if (!event.conversation_id) {
      continue;
    }
    const eventTime = toDate(event.event_time, new Date(0));
    const current = firstInboundByConversation.get(event.conversation_id);
    if (!current || eventTime < current) {
      firstInboundByConversation.set(event.conversation_id, eventTime);
    }
  }

  const conversationCounter = new Map<string, number>();
  for (const time of firstInboundByConversation.values()) {
    if (time < filters.from || time > filters.to) {
      continue;
    }
    const key = bucketKey(time, bucketInfo.type);
    conversationCounter.set(key, (conversationCounter.get(key) || 0) + 1);
  }
  const conversationTrendData = Array.from(conversationCounter.keys())
    .sort()
    .map((key) => ({ name: labelFromBucketKey(key, bucketInfo.type), value: conversationCounter.get(key) || 0 }));

  const otpDonutData = [
    { name: "Success", value: kpis.otpSuccessCount, color: "#10b981" },
    { name: "Failed", value: kpis.otpFailedCount, color: "#f43f5e" },
    { name: "Unconfirmed", value: kpis.otpUnconfirmedCount, color: "#f59e0b" },
    { name: "Not Sent", value: kpis.otpNotSentCount, color: "#475569" },
  ];

  const escalationRows = buildEscalationRows(events);
  const recentEvents = [...events]
    .sort((a, b) => toDate(b.event_time, new Date(0)).getTime() - toDate(a.event_time, new Date(0)).getTime())
    .slice(0, 200);

  // --- OTP per user ---
  const otpUserMap = new Map<string, { requested: number; success: number; failed: number; unconfirmed: number; notSent: number; conversationUrl: string }>();
  for (const event of events) {
    if (event.event_type !== 'otp_request' && event.event_type !== 'otp_outcome') continue;

    // Default UID is string or explicit 'unknown'
    const uid = event.customer_id || event.conversation_id || 'unknown';

    // Construct default static link if conversation_id is available
    const url = event.conversation_id ? `https://app.chatwoot.com/app/accounts/152788/inbox-view/conversation/${event.conversation_id}` : '';

    if (!otpUserMap.has(uid)) otpUserMap.set(uid, { requested: 0, success: 0, failed: 0, unconfirmed: 0, notSent: 0, conversationUrl: url });

    const entry = otpUserMap.get(uid)!;
    if (event.event_type === 'otp_request') entry.requested++;
    if (event.event_type === 'otp_outcome') {
      if (event.otp_status === 'success') entry.success++;
      else if (event.otp_status === 'failed') entry.failed++;
      else if (event.otp_status === 'unconfirmed') entry.unconfirmed++;
      else if (event.otp_status === 'not_sent') entry.notSent++;
    }
    // Update the existing conversational URL if empty but found on current row
    if (!entry.conversationUrl && url) {
      entry.conversationUrl = url;
    }
  }
  const otpPerUserRows = Array.from(otpUserMap.entries()).map(([customerId, counts]) => {
    const total = counts.success + counts.failed + counts.unconfirmed + counts.notSent;
    const successRate = total > 0 ? ((counts.success + counts.unconfirmed) / total) * 100 : 0;
    return { customerId, ...counts, total, successRate, conversationUrl: counts.conversationUrl };
  }).sort((a, b) => b.total - a.total);

  // --- Tokens per conversation ---
  const convTokenMap = new Map<string, { customerId: string; inputTokens: number; outputTokens: number; messageCount: number }>();
  for (const event of events) {
    if (!event.conversation_id) continue;
    const cid = event.conversation_id;
    if (!convTokenMap.has(cid)) convTokenMap.set(cid, { customerId: event.customer_id || 'unknown', inputTokens: 0, outputTokens: 0, messageCount: 0 });
    const entry = convTokenMap.get(cid)!;
    entry.inputTokens += Number(event.token_input || 0);
    entry.outputTokens += Number(event.token_output || 0);
    if (event.event_type === 'inbound_message' || event.event_type === 'outbound_message') entry.messageCount++;
  }
  const tokensPerConversationRows = Array.from(convTokenMap.entries()).map(([conversationId, data]) => ({
    conversationId,
    customerId: data.customerId,
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    totalTokens: data.inputTokens + data.outputTokens,
    messageCount: data.messageCount,
  })).filter(r => r.totalTokens > 0).sort((a, b) => b.totalTokens - a.totalTokens);

  return {
    pricing,
    kpis,
    prevKpis,
    bucketLabel: bucketInfo.label,
    messageTrendData,
    conversationTrendData,
    tokenTrendData,
    otpTrendData,
    otpDonutData,
    escalationTrendData,
    costTrendData,
    escalationRows,
    otpPerUserRows,
    tokensPerConversationRows,
    recentEvents,
  };
}
