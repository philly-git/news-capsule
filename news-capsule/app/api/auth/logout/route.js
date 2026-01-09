import { NextResponse } from 'next/server';
import { clearSession } from '../../../../lib/auth.js';

export async function POST() {
    try {
        await clearSession();

        return NextResponse.json({
            success: true,
            message: '已退出登录'
        });

    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: '退出失败' },
            { status: 500 }
        );
    }
}
