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
 * 获取可用的日期列表
 */
function getAvailableDates(lang) {
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
function readFeedsForDate(date, lang) {
    const sources = readSources();
    const enabledSources = sources.filter(s => s.enabled);
    const result = [];

    for (const source of enabledSources) {
        const filePath = path.join(FEEDS_DIR, source.id, `${date}-${lang}.json`);

        if (fs.existsSync(filePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                result.push({
                    id: source.id,
                    name: source.name,
                    language: source.language,
                    items: data.items || []
                });
            } catch (e) {
                console.error(`Failed to read ${filePath}:`, e);
            }
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
        const dates = getAvailableDates(lang);
        date = dates[0] || new Date().toISOString().split('T')[0];
    }

    const sources = readFeedsForDate(date, lang);

    return NextResponse.json({
        date,
        language: lang,
        sources,
        generatedAt: new Date().toISOString()
    });
}
