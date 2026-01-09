import { NextResponse } from 'next/server';
import { readJSON, listFiles } from '../../../lib/storage.js';

/**
 * 读取源配置
 */
async function readSources() {
    const data = await readJSON('sources.json');
    return data?.sources || [];
}

/**
 * 获取可用的日期列表
 */
async function getAvailableDates(lang) {
    const dates = new Set();

    const sourceDirs = await listFiles('feeds');
    for (const sourceId of sourceDirs) {
        if (sourceId.includes('.')) continue; // 跳过非目录

        const files = await listFiles(`feeds/${sourceId}`);
        for (const file of files) {
            // 匹配格式: 2026-01-05-zh.json
            const match = file.match(/^(\d{4}-\d{2}-\d{2})-(\w+)\.json$/);
            if (match && match[2] === lang) {
                dates.add(match[1]);
            }
        }
    }

    return Array.from(dates).sort().reverse();
}

/**
 * 读取指定日期和语言的所有源数据
 */
async function readFeedsForDate(date, lang) {
    const sources = await readSources();
    const enabledSources = sources.filter(s => s.enabled);
    const result = [];

    for (const source of enabledSources) {
        const data = await readJSON(`feeds/${source.id}/${date}-${lang}.json`);

        if (data) {
            result.push({
                id: source.id,
                name: source.name,
                language: source.language,
                items: data.items || []
            });
        }
    }

    return result;
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'zh';
    let date = searchParams.get('date');

    // 如果没有指定日期，获取最新的
    if (!date) {
        const dates = await getAvailableDates(lang);
        date = dates[0] || new Date().toISOString().split('T')[0];
    }

    const sources = await readFeedsForDate(date, lang);

    return NextResponse.json({
        date,
        language: lang,
        sources,
        generatedAt: new Date().toISOString()
    });
}
