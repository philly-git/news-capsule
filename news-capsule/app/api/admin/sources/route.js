import { NextResponse } from 'next/server';
import { getAllSources, addSource } from '../../../../lib/sources.js';
import { getAllFeedsStats, getSourceItems } from '../../../../lib/feeds.js';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const withItems = searchParams.get('withItems') === 'true';
        const sourceId = searchParams.get('sourceId');

        // 如果指定了单个源，返回该源的详细信息（含条目）
        if (sourceId) {
            const feedData = getSourceItems(sourceId);
            return NextResponse.json({
                success: true,
                ...feedData
            });
        }

        // 获取所有源配置
        const allSources = getAllSources();

        // 获取所有源的抓取统计
        const feedsStats = getAllFeedsStats();

        // 合并源配置和统计信息
        const sources = allSources.map(source => ({
            ...source,
            stats: feedsStats[source.id] || {
                totalItems: 0,
                newCount: 0,
                pendingCount: 0,
                queuedCount: 0,
                publishedCount: 0,
                archivedCount: 0,
                lastSync: null
            },
            // 如果请求带条目，返回条目列表
            items: withItems ? getSourceItems(source.id).items : undefined
        }));

        // 统计总览（五种状态）
        const totalNewItems = sources.reduce((sum, s) => sum + (s.stats.newCount || 0), 0);
        const totalPendingItems = sources.reduce((sum, s) => sum + (s.stats.pendingCount || 0), 0);
        const totalQueuedItems = sources.reduce((sum, s) => sum + (s.stats.queuedCount || 0), 0);
        const totalPublishedItems = sources.reduce((sum, s) => sum + (s.stats.publishedCount || 0), 0);
        const totalArchivedItems = sources.reduce((sum, s) => sum + (s.stats.archivedCount || 0), 0);

        return NextResponse.json({
            sources,
            totalSources: sources.length,
            totalNewItems,
            totalPendingItems,
            totalQueuedItems,
            totalPublishedItems,
            totalArchivedItems
        });

    } catch (error) {
        console.error('Sources API error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// 添加新的 RSS 源
export async function POST(request) {
    try {
        const { name, url, language, category } = await request.json();

        if (!name || !url) {
            return NextResponse.json(
                { error: '名称和链接不能为空' },
                { status: 400 }
            );
        }

        const newSource = addSource({ name, url, language, category });

        return NextResponse.json({
            success: true,
            source: newSource
        });

    } catch (error) {
        console.error('Add source error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 400 }
        );
    }
}
