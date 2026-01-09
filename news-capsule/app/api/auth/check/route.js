import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth.js';

export async function GET() {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { authenticated: false },
                { status: 401 }
            );
        }

        return NextResponse.json({
            authenticated: true,
            username: session.username
        });

    } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.json(
            { authenticated: false, error: error.message },
            { status: 500 }
        );
    }
}
