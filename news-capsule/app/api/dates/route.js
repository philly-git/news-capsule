import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FEEDS_DIR = path.join(process.cwd(), 'data', 'feeds');
const OLD_DATA_DIR = path.join(process.cwd(), 'data', 'news');

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'zh';

    try {
        const dates = new Set();

        // 从新的 feeds 目录结构读取
        if (fs.existsSync(FEEDS_DIR)) {
            const sourceDirs = fs.readdirSync(FEEDS_DIR);
            for (const sourceId of sourceDirs) {
                const sourceDir = path.join(FEEDS_DIR, sourceId);
                if (!fs.statSync(sourceDir).isDirectory()) continue;

                const files = fs.readdirSync(sourceDir);
                for (const file of files) {
                    const match = file.match(/^(\d{4}-\d{2}-\d{2})-(\w+)\.json$/);
                    if (match && match[2] === lang) {
                        dates.add(match[1]);
                    }
                }
            }
        }

        // 兼容旧的 news 目录（如果存在）
        if (fs.existsSync(OLD_DATA_DIR)) {
            const files = fs.readdirSync(OLD_DATA_DIR).filter(f => f.endsWith('.json'));
            for (const file of files) {
                const matchNew = file.match(/^(\d{4}-\d{2}-\d{2})-(\w+)\.json$/);
                if (matchNew && matchNew[2] === lang) {
                    dates.add(matchNew[1]);
                }
                const matchOld = file.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
                if (matchOld) {
                    dates.add(matchOld[1]);
                }
            }
        }

        const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a));
        return NextResponse.json({ dates: sortedDates });
    } catch (error) {
        console.error('Error getting dates:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
