import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Count all events
        const countResult = await query<{ total: string }>('SELECT COUNT(*) as total FROM analytics_events');
        const total = Number(countResult[0]?.total || 0);

        // Get distinct event types
        const typesResult = await query<{ event_type: string; cnt: string }>(
            'SELECT event_type, COUNT(*) as cnt FROM analytics_events GROUP BY event_type ORDER BY cnt DESC'
        );

        // Check how many ai_usage events have non-zero tokens
        const tokenCheck = await query<{ with_tokens: string; without_tokens: string }>(
            `SELECT 
                COUNT(*) FILTER (WHERE token_input > 0 OR token_output > 0) as with_tokens,
                COUNT(*) FILTER (WHERE token_input = 0 AND token_output = 0) as without_tokens
             FROM analytics_events WHERE event_type = 'ai_usage'`
        );

        // Get last 5 ai_usage events specifically (with metadata)
        const recentAiUsage = await query<{
            event_key: string; event_time: string; conversation_id: string;
            token_input: number; token_output: number; metadata: string;
        }>(
            `SELECT event_key, event_time, conversation_id, token_input, token_output, metadata::text
             FROM analytics_events WHERE event_type = 'ai_usage'
             ORDER BY event_time DESC LIMIT 5`
        );

        // Sum of all tokens across ALL event types
        const tokenSums = await query<{ total_in: string; total_out: string }>(
            'SELECT COALESCE(SUM(token_input), 0) as total_in, COALESCE(SUM(token_output), 0) as total_out FROM analytics_events'
        );

        // Get last 5 events (most recent)
        const recentResult = await query<{ event_type: string; event_time: string; event_key: string; conversation_id: string; token_input: number; token_output: number }>(
            'SELECT event_type, event_time, event_key, conversation_id, token_input, token_output FROM analytics_events ORDER BY event_time DESC LIMIT 5'
        );

        return NextResponse.json({
            status: 'ok',
            database_url_set: !!process.env.DATABASE_URL,
            total_events: total,
            event_types: typesResult.map(r => ({ type: r.event_type, count: Number(r.cnt) })),
            token_diagnosis: {
                ai_usage_with_nonzero_tokens: Number(tokenCheck[0]?.with_tokens || 0),
                ai_usage_with_zero_tokens: Number(tokenCheck[0]?.without_tokens || 0),
                total_token_input_all_events: Number(tokenSums[0]?.total_in || 0),
                total_token_output_all_events: Number(tokenSums[0]?.total_out || 0),
            },
            recent_ai_usage_5: recentAiUsage.map(r => ({
                key: r.event_key,
                time: r.event_time,
                conversation: r.conversation_id,
                token_input: r.token_input,
                token_output: r.token_output,
                metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
            })),
            recent_5: recentResult.map(r => ({
                type: r.event_type,
                time: r.event_time,
                key: String(r.event_key || '').substring(0, 30) + '...',
                conversation: r.conversation_id,
                tokens_in: r.token_input,
                tokens_out: r.token_output,
            })),
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
    }
}
