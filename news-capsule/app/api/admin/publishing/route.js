import { NextResponse } from 'next/server';
import { getAllQueuedItems, batchUpdateItemsStatus } from '../../../../lib/feeds.js';
import { generateNewsFromItems } from '../../../../lib/news-generator.js';

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

        console.log(`[Publish] Processing ${zhItems.length} ZH items and ${enItems.length} EN items`);

        // 3. 直接调用生成函数（无需 HTTP 请求，避开 Vercel 鉴权）
        let zhResult = null;
        let enResult = null;

        if (zhItems.length > 0) {
            try {
                zhResult = await generateNewsFromItems({
                    items: zhItems,
                    date,
                    language: 'zh'
                });
            } catch (error) {
                console.error('Failed to generate zh news:', error);
                throw error;
            }
        }

        if (enItems.length > 0) {
            try {
                enResult = await generateNewsFromItems({
                    items: enItems,
                    date,
                    language: 'en'
                });
            } catch (error) {
                console.error('Failed to generate en news:', error);
                throw error;
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
