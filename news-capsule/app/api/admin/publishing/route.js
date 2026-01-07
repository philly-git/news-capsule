import { NextResponse } from 'next/server';
import { getAllQueuedItems, batchUpdateItemsStatus } from '../../../../lib/feeds.js';

// GET: 获取所有待出版条目
export async function GET() {
    try {
        const items = getAllQueuedItems();

        return NextResponse.json({
            success: true,
            items,
            totalItems: items.length
        });
    } catch (error) {
        console.error('Get queued items error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// POST: 发布待出版条目（调用 LLM 总结并更新状态）
export async function POST(request) {
    try {
        const { itemIds, publishDate } = await request.json();

        if (!itemIds || itemIds.length === 0) {
            return NextResponse.json(
                { error: '没有选择要发布的条目' },
                { status: 400 }
            );
        }

        // 1. 获取待出版的条目详情
        const allQueued = getAllQueuedItems();
        const itemsToPublish = allQueued.filter(item => itemIds.includes(item.id));

        if (itemsToPublish.length === 0) {
            return NextResponse.json(
                { error: '没有找到待出版的条目' },
                { status: 400 }
            );
        }

        // 2. 调用现有的新闻生成逻辑（动态导入避免循环依赖）
        // 这里我们直接调用 generate-news API
        const generateRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-news`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: itemsToPublish,
                date: publishDate || new Date().toISOString().split('T')[0]
            })
        });

        if (!generateRes.ok) {
            const errorData = await generateRes.json();
            return NextResponse.json(
                { error: errorData.error || '生成失败' },
                { status: 500 }
            );
        }

        const generateResult = await generateRes.json();

        // 3. 更新条目状态为 published
        const updateResult = batchUpdateItemsStatus(itemIds, 'published');

        return NextResponse.json({
            success: true,
            generated: generateResult,
            updated: updateResult.totalUpdated,
            publishedItems: itemsToPublish.length
        });

    } catch (error) {
        console.error('Publish error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
