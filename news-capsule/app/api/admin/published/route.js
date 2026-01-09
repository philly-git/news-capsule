import { NextResponse } from 'next/server';
import { readJSON, listFiles } from '@/lib/storage';
import { getAllSources } from '@/lib/sources';

/**
 * 获取可用的已出版日期列表
 */
async function getPublishedDates(lang) {
    const dates = new Set();

    try {
        const sourceDirs = await listFiles('feeds');

        for (const sourceId of sourceDirs) {
            // 跳过非目录项
            if (sourceId.includes('.')) continue;

            const files = await listFiles(`feeds/${sourceId}`);
            for (const file of files) {
                // 匹配格式: 2026-01-05-zh.json (已出版的文件，不是 items.json)
                const match = file.match(/^(\d{4}-\d{2}-\d{2})-(\w+)\.json$/);
                if (match && match[2] === lang) {
                    dates.add(match[1]);
                }
            }
        }
    } catch (error) {
        console.error('Failed to get published dates:', error);
    }

    return Array.from(dates).sort().reverse();
}

/**
 * 读取指定日期和语言的所有已出版内容
 */
async function readPublishedContent(date, lang) {
    const sources = await getAllSources();
    const enabledSources = sources.filter(s => s.enabled);
    const result = [];

    for (const source of enabledSources) {
        try {
            const data = await readJSON(`feeds/${source.id}/${date}-${lang}.json`);

            if (data) {
                result.push({
                    sourceId: source.id,
                    sourceName: source.name,
                    sourceLanguage: source.language,
                    publishedAt: data.publishedAt,
                    items: (data.items || []).map(item => ({
                        ...item,
                        sourceId: source.id,
                        sourceName: source.name
                    }))
                });
            }
        } catch (e) {
            console.error(`Failed to read ${source.id}/${date}-${lang}.json:`, e);
        }
    }

    return result;
}

/**
 * GET - 获取已出版内容列表
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'zh';
    let date = searchParams.get('date');

    // 获取可用日期
    const availableDates = await getPublishedDates(lang);

    // 如果没有指定日期，使用最新的
    if (!date && availableDates.length > 0) {
        date = availableDates[0];
    }

    // 如果仍然没有日期，返回空结果
    if (!date) {
        return NextResponse.json({
            date: null,
            language: lang,
            availableDates: [],
            sources: []
        });
    }

    const sources = await readPublishedContent(date, lang);

    // 统计信息
    let totalItems = 0;
    for (const source of sources) {
        totalItems += source.items.length;
    }

    return NextResponse.json({
        date,
        language: lang,
        availableDates,
        sources,
        totalItems,
        generatedAt: new Date().toISOString()
    });
}
