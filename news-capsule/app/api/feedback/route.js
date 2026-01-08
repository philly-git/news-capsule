import { NextResponse } from 'next/server';
import { getFeedback, saveFeedback } from '@/lib/feedback';

export async function GET() {
    try {
        const feedback = await getFeedback();
        return NextResponse.json(feedback);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { content, contact } = body;

        if (!content || !contact) {
            return NextResponse.json({ error: 'Content and contact are required' }, { status: 400 });
        }

        const newEntry = await saveFeedback({ content, contact });
        return NextResponse.json(newEntry);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }
}
