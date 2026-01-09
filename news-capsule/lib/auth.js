/**
 * Admin 认证模块
 * 支持多用户登录，用户配置通过环境变量 ADMIN_USERS 设置
 * 格式: username1:password1,username2:password2
 */

import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

/**
 * 解析环境变量中的用户列表
 */
function getAdminUsers() {
    const usersEnv = process.env.ADMIN_USERS || '';
    if (!usersEnv) return [];

    return usersEnv.split(',').map(pair => {
        const [username, password] = pair.split(':');
        return { username: username?.trim(), password: password?.trim() };
    }).filter(u => u.username && u.password);
}

/**
 * 生成 session token
 */
function generateSessionToken(username) {
    const data = `${username}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
    return Buffer.from(data).toString('base64');
}

/**
 * 解析 session token
 */
function parseSessionToken(token) {
    try {
        const data = Buffer.from(token, 'base64').toString('utf-8');
        const [username] = data.split(':');
        return { username, valid: true };
    } catch {
        return { username: null, valid: false };
    }
}

/**
 * 验证用户凭据
 */
export function validateCredentials(username, password) {
    const users = getAdminUsers();
    return users.some(u => u.username === username && u.password === password);
}

/**
 * 创建登录 session
 */
export async function createSession(username) {
    const token = generateSessionToken(username);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
    });

    return token;
}

/**
 * 获取当前 session
 */
export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    const { username, valid } = parseSessionToken(token);
    if (!valid) {
        return null;
    }

    return { username };
}

/**
 * 清除 session（登出）
 */
export async function clearSession() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * 检查是否已登录
 */
export async function isAuthenticated() {
    const session = await getSession();
    return session !== null;
}
