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

        // Get last 5 events (most recent)
        const recentResult = await query<{ event_type: string; event_time: string; event_key: string; conversation_id: string; token_input: number; token_output: number }>(
            'SELECT event_type, event_time, event_key, conversation_id, token_input, token_output FROM analytics_events ORDER BY event_time DESC LIMIT 5'
        );

        return NextResponse.json({
            status: 'ok',
            database_url_set: !!process.env.DATABASE_URL,
            total_events: total,
            event_types: typesResult.map(r => ({ type: r.event_type, count: Number(r.cnt) })),
            recent_5: recentResult.map(r => ({
                type: r.event_type,
                time: r.event_time,
                key: r.event_key?.substring(0, 30) + '...',
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
