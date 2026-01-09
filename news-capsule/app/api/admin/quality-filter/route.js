import { NextResponse } from 'next/server';
import { readSettings, writeSettings, readJSON, writeJSON } from '@/lib/storage';
import { getEnabledSources } from '@/lib/sources';
import { getSourceItems, saveSourceItems } from '@/lib/feeds';
import {
    DEFAULT_QUALITY_RULES,
    checkItemsQuality
} from '@/lib/qualityFilter';

/**
 * 获取质量过滤规则
 */
async function getQualityRules() {
    const settings = await readSettings();
    return settings.qualityFilter?.rules || DEFAULT_QUALITY_RULES;
}

/**
 * GET - 获取当前过滤规则配置
 */
export async function GET() {
    try {
        const settings = await readSettings();
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

        const settings = await readSettings();
        settings.qualityFilter = {
            enabled: enabled ?? settings.qualityFilter?.enabled ?? true,
            rules: rules ? { ...DEFAULT_QUALITY_RULES, ...rules } : settings.qualityFilter?.rules || DEFAULT_QUALITY_RULES,
            updatedAt: new Date().toISOString()
        };

        await writeSettings(settings);

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

        const rules = await getQualityRules();
        const allSources = await getEnabledSources();

        // 确定要处理的源
        let sourcesToProcess;
        if (sourceIds && sourceIds.length > 0) {
            sourcesToProcess = allSources.filter(s => sourceIds.includes(s.id));
        } else {
            sourcesToProcess = allSources;
        }

        const results = {};

        for (const source of sourcesToProcess) {
            const sourceData = await getSourceItems(source.id);
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
                await saveSourceItems(source.id, sourceData);
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
