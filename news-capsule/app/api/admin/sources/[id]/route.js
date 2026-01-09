import { NextResponse } from 'next/server';
import { getSourceById, updateSource, deleteSource, toggleSource } from '../../../../../lib/sources.js';
import { getSourceItems, updateItemStatus, batchUpdateItemStatus } from '../../../../../lib/feeds.js';

// 获取单个源详情（含条目）
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const source = await getSourceById(id);

        if (!source) {
            return NextResponse.json(
                { error: '源不存在' },
                { status: 404 }
            );
        }

        // 获取该源的所有条目
        const feedData = await getSourceItems(id);

        return NextResponse.json({
            success: true,
            source,
            items: feedData.items,
            lastSync: feedData.lastSync,
            totalItems: feedData.totalItems
        });

    } catch (error) {
        console.error('Get source error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// 更新源（启用/禁用、修改信息）或更新条目状态
export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();

        // 如果是更新条目状态
        if (body.itemId && body.status) {
            const item = await updateItemStatus(id, body.itemId, body.status);
            return NextResponse.json({ success: true, item });
        }

        // 如果是批量更新条目状态
        if (body.itemIds && body.status) {
            const result = await batchUpdateItemStatus(id, body.itemIds, body.status);
            return NextResponse.json({ success: true, ...result });
        }

        // 如果是切换启用/禁用
        if (body.toggle === true) {
            const source = await toggleSource(id);
            return NextResponse.json({ success: true, source });
        }

        // 否则执行源信息更新
        const source = await updateSource(id, body);
        return NextResponse.json({ success: true, source });

    } catch (error) {
        console.error('Update source error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 400 }
        );
    }
}

// 删除源
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const deleteData = searchParams.get('deleteData') === 'true';

        const deleted = await deleteSource(id);

        // 如果选择删除数据，删除对应的 feeds 目录
        if (deleteData) {
            const fs = await import('fs');
            const path = await import('path');
            const feedDir = path.default.join(process.cwd(), 'data', 'feeds', id);

            if (fs.default.existsSync(feedDir)) {
                fs.default.rmSync(feedDir, { recursive: true });
            }
        }

        return NextResponse.json({
            success: true,
            deleted,
            dataDeleted: deleteData
        });

    } catch (error) {
        console.error('Delete source error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 400 }
        );
    }
}
