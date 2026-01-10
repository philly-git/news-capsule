import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/storage';

const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;
const BUTTONDOWN_API_URL = 'https://api.buttondown.email/v1/subscribers';

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

async function addToButtondown(email) {
    if (!BUTTONDOWN_API_KEY) {
        console.warn('BUTTONDOWN_API_KEY not configured, skipping Buttondown');
        return { success: true, skipped: true };
    }

    try {
        const response = await fetch(BUTTONDOWN_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${BUTTONDOWN_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email_address: email }),
        });

        if (response.ok) {
            return { success: true };
        }

        const errorData = await response.json().catch(() => ({}));

        // 处理各种错误情况
        if (errorData.code === 'email_already_exists') {
            return { success: false, alreadyExists: true };
        }

        // 被防火墙阻止（通常是无效或一次性邮箱）
        if (errorData.code === 'subscriber_blocked') {
            return { success: false, blocked: true };
        }

        console.error('Buttondown API error:', response.status, errorData);
        return { success: false, error: errorData };
    } catch (error) {
        console.error('Buttondown API fetch error:', error);
        return { success: false, error: error.message };
    }
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

        // 添加到 Buttondown
        const buttondownResult = await addToButtondown(email);

        if (!buttondownResult.success && buttondownResult.alreadyExists) {
            return NextResponse.json(
                { error: '该邮箱已订阅' },
                { status: 400 }
            );
        }

        if (!buttondownResult.success && buttondownResult.blocked) {
            return NextResponse.json(
                { error: '该邮箱地址无法使用，请使用常规邮箱' },
                { status: 400 }
            );
        }

        if (!buttondownResult.success && !buttondownResult.skipped) {
            return NextResponse.json(
                { error: '订阅失败，请稍后重试' },
                { status: 500 }
            );
        }

        // 同时保存到本地（作为备份）
        const data = await getSubscribers();
        if (!data.subscribers.some(sub => sub.email === email)) {
            data.subscribers.push({
                email,
                subscribedAt: new Date().toISOString(),
            });
            data.count = data.subscribers.length;
            await saveSubscribers(data);
        }

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
