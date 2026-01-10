import { NextResponse } from 'next/server';

const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;
const BUTTONDOWN_API_URL = 'https://api.buttondown.email/v1/subscribers';

async function addToButtondown(email, language = 'zh') {
    if (!BUTTONDOWN_API_KEY) {
        console.warn('BUTTONDOWN_API_KEY not configured');
        return { success: false, error: 'API key not configured' };
    }

    try {
        const response = await fetch(BUTTONDOWN_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${BUTTONDOWN_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email_address: email,
                metadata: { language }  // 存储用户的语言偏好
            }),
        });

        if (response.ok) {
            return { success: true };
        }

        const errorData = await response.json().catch(() => ({}));

        if (errorData.code === 'email_already_exists') {
            return { success: false, alreadyExists: true };
        }

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

async function getSubscriberCount() {
    if (!BUTTONDOWN_API_KEY) {
        return 0;
    }

    try {
        // 使用 page_size=1 只获取最少数据，但仍能得到 count
        const response = await fetch(`${BUTTONDOWN_API_URL}?page_size=1`, {
            headers: {
                'Authorization': `Token ${BUTTONDOWN_API_KEY}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            return data.count || 0;
        }
        return 0;
    } catch (error) {
        console.error('Failed to get subscriber count:', error);
        return 0;
    }
}

export async function POST(request) {
    try {
        const { email, language = 'zh' } = await request.json();

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return NextResponse.json(
                { error: '请输入有效的邮箱地址' },
                { status: 400 }
            );
        }

        const buttondownResult = await addToButtondown(email, language);

        // 已经订阅过，返回友好提示
        if (!buttondownResult.success && buttondownResult.alreadyExists) {
            const count = await getSubscriberCount();
            return NextResponse.json({
                success: true,
                message: '您已订阅，感谢关注！',
                count,
            });
        }

        // 邮箱被防火墙拦截
        if (!buttondownResult.success && buttondownResult.blocked) {
            return NextResponse.json(
                { error: '该邮箱地址无法使用，请使用常规邮箱' },
                { status: 400 }
            );
        }

        // 其他错误
        if (!buttondownResult.success) {
            return NextResponse.json(
                { error: '订阅失败，请稍后重试' },
                { status: 500 }
            );
        }

        // 订阅成功
        const count = await getSubscriberCount();
        return NextResponse.json({
            success: true,
            message: '订阅成功',
            count,
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
    const count = await getSubscriberCount();
    return NextResponse.json({ count });
}
