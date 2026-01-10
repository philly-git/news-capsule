import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/storage';

/**
 * DELETE - 删除已发布的某篇文章
 * 
 * URL: /api/admin/published/[sourceId]?date=2026-01-09&lang=zh&itemId=abc123
 */
export async function DELETE(request, { params }) {
    try {
        const { sourceId } = await params;
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const lang = searchParams.get('lang') || 'zh';
        const itemId = searchParams.get('itemId');

        if (!date || !itemId) {
            return NextResponse.json(
                { error: '缺少必需参数: date, itemId' },
                { status: 400 }
            );
        }

        const filePath = `feeds/${sourceId}/${date}-${lang}.json`;
        const data = await readJSON(filePath);

        if (!data) {
            return NextResponse.json(
                { error: '文件不存在' },
                { status: 404 }
            );
        }

        const originalCount = data.items?.length || 0;
        data.items = (data.items || []).filter(item => item.id !== itemId);
        const newCount = data.items.length;

        if (originalCount === newCount) {
            return NextResponse.json(
                { error: '未找到该文章' },
                { status: 404 }
            );
        }

        // 更新 lastModified
        data.lastModified = new Date().toISOString();

        await writeJSON(filePath, data);

        return NextResponse.json({
            success: true,
            message: '文章已删除',
            remainingItems: newCount
        });

    } catch (error) {
        console.error('Delete published item error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
