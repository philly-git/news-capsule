import { NextResponse } from 'next/server';
import { listFiles } from '../../../lib/storage.js';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'zh';

    try {
        const dates = new Set();

        // 从 feeds 目录结构读取
        const sourceDirs = await listFiles('feeds');
        for (const sourceId of sourceDirs) {
            if (sourceId.includes('.')) continue; // 跳过非目录

            const files = await listFiles(`feeds/${sourceId}`);
            for (const file of files) {
                const match = file.match(/^(\d{4}-\d{2}-\d{2})-(\w+)\.json$/);
                if (match && match[2] === lang) {
                    dates.add(match[1]);
                }
            }
        }

        // 兼容旧的 news 目录
        const newsFiles = await listFiles('news');
        for (const file of newsFiles) {
            const matchNew = file.match(/^(\d{4}-\d{2}-\d{2})-(\w+)\.json$/);
            if (matchNew && matchNew[2] === lang) {
                dates.add(matchNew[1]);
            }
            const matchOld = file.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
            if (matchOld) {
                dates.add(matchOld[1]);
            }
        }

        const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a));
        return NextResponse.json({ dates: sortedDates });
    } catch (error) {
        console.error('Error getting dates:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
