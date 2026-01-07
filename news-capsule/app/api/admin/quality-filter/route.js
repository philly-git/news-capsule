import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
    DEFAULT_QUALITY_RULES,
    checkItemsQuality
} from '@/lib/qualityFilter';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
const FEEDS_DIR = path.join(DATA_DIR, 'feeds');
const SOURCES_PATH = path.join(DATA_DIR, 'sources.json');

/**
 * 读取设置
 */
function readSettings() {
    if (!fs.existsSync(SETTINGS_PATH)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    } catch {
        return {};
    }
}

/**
 * 保存设置
 */
function saveSettings(settings) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

/**
 * 获取质量过滤规则
 */
function getQualityRules() {
    const settings = readSettings();
    return settings.qualityFilter?.rules || DEFAULT_QUALITY_RULES;
}

/**
 * 读取源的条目数据
 */
function readSourceItems(sourceId) {
    const itemsPath = path.join(FEEDS_DIR, sourceId, 'items.json');
    if (!fs.existsSync(itemsPath)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));
    } catch {
        return null;
    }
}

/**
 * 保存源的条目数据
 */
function saveSourceItems(sourceId, data) {
    const itemsPath = path.join(FEEDS_DIR, sourceId, 'items.json');
    fs.writeFileSync(itemsPath, JSON.stringify(data, null, 2));
}

/**
 * 获取所有启用的源
 */
function getEnabledSources() {
    if (!fs.existsSync(SOURCES_PATH)) {
        return [];
    }
    try {
        const data = JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf-8'));
        return data.sources || [];
    } catch {
        return [];
    }
}

/**
 * GET - 获取当前过滤规则配置
 */
export async function GET() {
    try {
        const settings = readSettings();
        const rules = settings.qualityFilter?.rules || DEFAULT_QUALITY_RULES;
        const enabled = settings.qualityFilter?.enabled ?? true;

        return NextResponse.json({
            success: true,
            config: {
                enabled,
                rules
            },
            defaultRules: DEFAULT_QUALITY_RULES
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * PUT - 更新过滤规则配置
 */
export async function PUT(request) {
    try {
        const body = await request.json();
        const { enabled, rules } = body;

        const settings = readSettings();
        settings.qualityFilter = {
            enabled: enabled ?? settings.qualityFilter?.enabled ?? true,
            rules: rules ? { ...DEFAULT_QUALITY_RULES, ...rules } : settings.qualityFilter?.rules || DEFAULT_QUALITY_RULES,
            updatedAt: new Date().toISOString()
        };

        saveSettings(settings);

        return NextResponse.json({
            success: true,
            config: settings.qualityFilter
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST - 执行质量过滤
 * Body: { sourceIds?: string[], dryRun?: boolean }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { sourceIds, dryRun = false } = body;

        const rules = getQualityRules();
        const allSources = getEnabledSources();

        // 确定要处理的源
        let sourcesToProcess;
        if (sourceIds && sourceIds.length > 0) {
            sourcesToProcess = allSources.filter(s => sourceIds.includes(s.id));
        } else {
            sourcesToProcess = allSources;
        }

        const results = {};

        for (const source of sourcesToProcess) {
            const sourceData = readSourceItems(source.id);
            if (!sourceData || !sourceData.items) {
                results[source.id] = {
                    total: 0,
                    flagged: 0,
                    error: 'No items found'
                };
                continue;
            }

            // 执行质量检测
            const { items: checkedItems, stats } = checkItemsQuality(sourceData.items, rules);

            // 收集被标记的详情
            const flaggedDetails = checkedItems
                .filter(item => item.qualityFlags?.skipSummary)
                .map(item => ({
                    id: item.id,
                    title: item.title,
                    wordCount: item.wordCount,
                    reasons: item.qualityFlags.reasons
                }));

            results[source.id] = {
                name: source.name,
                total: stats.total,
                flagged: stats.flagged,
                byReason: stats.byReason,
                details: flaggedDetails
            };

            // 非预览模式时，保存结果
            if (!dryRun) {
                // 将被质量过滤命中的条目状态设为 archived
                for (const item of checkedItems) {
                    if (item.qualityFlags?.skipSummary && item.status !== 'published') {
                        item.status = 'archived';
                    }
                }
                sourceData.items = checkedItems;
                sourceData.qualityCheckedAt = new Date().toISOString();
                saveSourceItems(source.id, sourceData);
            }
        }

        // 汇总统计
        const summary = {
            totalSources: Object.keys(results).length,
            totalItems: Object.values(results).reduce((sum, r) => sum + (r.total || 0), 0),
            totalFlagged: Object.values(results).reduce((sum, r) => sum + (r.flagged || 0), 0),
            dryRun
        };

        return NextResponse.json({
            success: true,
            summary,
            results,
            rules
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
