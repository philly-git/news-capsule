import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FEEDS_DIR = path.join(process.cwd(), 'data', 'feeds');
const SOURCES_PATH = path.join(process.cwd(), 'data', 'sources.json');

/**
 * 读取源配置
 */
function readSources() {
    if (!fs.existsSync(SOURCES_PATH)) {
        return [];
    }
    try {
        const data = JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf-8'));
        return data.sources || [];
    } catch (e) {
        console.error('Failed to read sources:', e);
        return [];
    }
}

/**
 * 获取可用的已出版日期列表
 */
function getPublishedDates(lang) {
    const dates = new Set();

    if (!fs.existsSync(FEEDS_DIR)) {
        return [];
    }

    const sourceDirs = fs.readdirSync(FEEDS_DIR);
    for (const sourceId of sourceDirs) {
        const sourceDir = path.join(FEEDS_DIR, sourceId);
        if (!fs.statSync(sourceDir).isDirectory()) continue;

        const files = fs.readdirSync(sourceDir);
        for (const file of files) {
            // 匹配格式: 2026-01-05-zh.json (已出版的文件，不是 items.json)
            const match = file.match(/^(\d{4}-\d{2}-\d{2})-(\w+)\.json$/);
            if (match && match[2] === lang) {
                dates.add(match[1]);
            }
        }
    }

    return Array.from(dates).sort().reverse();
}

/**
 * 读取指定日期和语言的所有已出版内容
 */
function readPublishedContent(date, lang) {
    const sources = readSources();
    const enabledSources = sources.filter(s => s.enabled);
    const result = [];

    for (const source of enabledSources) {
        const filePath = path.join(FEEDS_DIR, source.id, `${date}-${lang}.json`);

        if (fs.existsSync(filePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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
            } catch (e) {
                console.error(`Failed to read ${filePath}:`, e);
            }
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
    const availableDates = getPublishedDates(lang);

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

    const sources = readPublishedContent(date, lang);

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
