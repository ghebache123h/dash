import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
        }

        const adminStr = process.env.DASH_ADMINS || '';
        const userStr = process.env.DASH_USERS || '';

        if (!adminStr && !userStr) {
            console.error('[AUTH] Neither DASH_ADMINS nor DASH_USERS env vars are set.');
            return NextResponse.json({ error: 'Server auth not configured. Set DASH_ADMINS / DASH_USERS env vars.' }, { status: 500 });
        }

        // Parse env vars strictly using Format: user1:pass1,user2:pass2
        const checkAuth = (str: string, targetRole: 'admin' | 'user') => {
            const pairs = str.split(',').map((p) => p.trim()).filter(Boolean);
            for (const pair of pairs) {
                const [u, p] = pair.split(':');
                if (u === username && p === password) {
                    return targetRole;
                }
            }
            return null;
        };

        const role = checkAuth(adminStr, 'admin') || checkAuth(userStr, 'user');

        if (role) {
            return NextResponse.json({ success: true, role, username });
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
