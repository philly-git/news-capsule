import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/storage';

async function getSubscribers() {
    try {
        const data = await readJSON('subscribers.json');
        return data || { subscribers: [], count: 0 };
    } catch (error) {
        return { subscribers: [], count: 0 };
    }
}

async function saveSubscribers(data) {
    await writeJSON('subscribers.json', data);
}

export async function POST(request) {
    try {
        const { email } = await request.json();

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return NextResponse.json(
                { error: '请输入有效的邮箱地址' },
                { status: 400 }
            );
        }

        const data = await getSubscribers();

        // 检查是否已订阅
        if (data.subscribers.some(sub => sub.email === email)) {
            return NextResponse.json(
                { error: '该邮箱已订阅' },
                { status: 400 }
            );
        }

        // 添加新订阅者
        data.subscribers.push({
            email,
            subscribedAt: new Date().toISOString(),
        });
        data.count = data.subscribers.length;

        await saveSubscribers(data);

        return NextResponse.json({
            success: true,
            message: '订阅成功',
            count: data.count,
        });
    } catch (error) {
        console.error('Subscribe error:', error);
        return NextResponse.json(
            { error: '服务器错误，请稍后重试' },
            { status: 500 }
        );
    }
}

export async function GET() {
    const data = await getSubscribers();
    return NextResponse.json({ count: data.count });
}
