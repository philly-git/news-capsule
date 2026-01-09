import { NextResponse } from 'next/server';
import { getAllQueuedItems, batchUpdateItemsStatus } from '../../../../lib/feeds.js';

// GET: 获取所有待出版条目
export async function GET() {
    try {
        const items = await getAllQueuedItems();


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

// POST: 发布待出版条目（支持多语言选择）
export async function POST(request) {
    try {
        const { items: itemsWithLang, publishDate } = await request.json();

        if (!itemsWithLang || itemsWithLang.length === 0) {
            return NextResponse.json(
                { error: '没有选择要发布的条目' },
                { status: 400 }
            );
        }

        // 1. 获取待出版的条目详情
        const allQueued = await getAllQueuedItems();
        const itemIds = itemsWithLang.map(item => item.id);
        const itemsToPublish = allQueued.filter(item => itemIds.includes(item.id));

        if (itemsToPublish.length === 0) {
            return NextResponse.json(
                { error: '没有找到待出版的条目' },
                { status: 400 }
            );
        }

        // 2. 按目标语言分组
        const langMap = {};
        itemsWithLang.forEach(item => {
            langMap[item.id] = item.targetLang || 'both';
        });

        const zhItems = itemsToPublish.filter(item => {
            const lang = langMap[item.id];
            return lang === 'zh' || lang === 'both';
        });

        const enItems = itemsToPublish.filter(item => {
            const lang = langMap[item.id];
            return lang === 'en' || lang === 'both';
        });

        const date = publishDate || new Date().toISOString().split('T')[0];
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        // 3. 分别调用生成 API（中文和英文）
        let zhResult = null;
        let enResult = null;

        if (zhItems.length > 0) {
            const zhRes = await fetch(`${baseUrl}/api/generate-news`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: zhItems,
                    date,
                    language: 'zh'
                })
            });
            if (zhRes.ok) {
                zhResult = await zhRes.json();
            } else {
                console.error('Failed to generate zh news:', await zhRes.text());
            }
        }

        if (enItems.length > 0) {
            const enRes = await fetch(`${baseUrl}/api/generate-news`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: enItems,
                    date,
                    language: 'en'
                })
            });
            if (enRes.ok) {
                enResult = await enRes.json();
            } else {
                console.error('Failed to generate en news:', await enRes.text());
            }
        }

        // 4. 更新条目状态为 published
        const updateResult = await batchUpdateItemsStatus(itemIds, 'published');

        return NextResponse.json({
            success: true,
            zhCount: zhItems.length,
            enCount: enItems.length,
            zhResult,
            enResult,
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
