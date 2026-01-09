import { NextResponse } from 'next/server';
import { validateCredentials, createSession } from '../../../../lib/auth.js';

export async function POST(request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: '请输入用户名和密码' },
                { status: 400 }
            );
        }

        const isValid = validateCredentials(username, password);

        if (!isValid) {
            return NextResponse.json(
                { error: '用户名或密码错误' },
                { status: 401 }
            );
        }

        await createSession(username);

        return NextResponse.json({
            success: true,
            message: '登录成功'
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: '登录失败，请稍后重试' },
            { status: 500 }
        );
    }
}
