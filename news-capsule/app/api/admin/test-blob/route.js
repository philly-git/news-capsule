import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // 'read' or 'write'
    const fileName = 'test-blob-access.json';

    try {
        if (action === 'write') {
            const data = {
                timestamp: Date.now(),
                message: 'Hello from Vercel Blob!'
            };
            await writeJSON(fileName, data);
            return NextResponse.json({ success: true, action: 'write', data });
        }

        if (action === 'read') {
            const data = await readJSON(fileName);
            return NextResponse.json({ success: true, action: 'read', data });
        }

        return NextResponse.json({ error: 'Invalid action. Use ?action=write or ?action=read' });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
