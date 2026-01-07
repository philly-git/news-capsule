import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SUBSCRIBERS_FILE = path.join(process.cwd(), 'data', 'subscribers.json');

function getSubscribers() {
    try {
        if (fs.existsSync(SUBSCRIBERS_FILE)) {
            const content = fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8');
            return JSON.parse(content);
        }
        return { subscribers: [], count: 0 };
    } catch (error) {
        return { subscribers: [], count: 0 };
    }
}

function saveSubscribers(data) {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(data, null, 2));
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

        const data = getSubscribers();

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

        saveSubscribers(data);

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
    const data = getSubscribers();
    return NextResponse.json({ count: data.count });
}
