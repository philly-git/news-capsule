import { NextResponse } from 'next/server';
import { readJSON, listFiles } from '@/lib/storage';
import { getAllSources } from '@/lib/sources';

const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://news-capsule.vercel.app';

/**
 * 读取指定日期的已发布内容
 */
async function getPublishedItems(date, lang) {
    const sources = await getAllSources();
    const enabledSources = sources.filter(s => s.enabled);
    const allItems = [];

    await Promise.all(
        enabledSources.map(async (source) => {
            try {
                const data = await readJSON(`feeds/${source.id}/${date}-${lang}.json`);
                if (data && data.items) {
                    allItems.push(...data.items.map(item => ({
                        ...item,
                        sourceName: source.name
                    })));
                }
            } catch (e) {
                // 忽略读取错误
            }
        })
    );

    return allItems;
}

/**
 * 生成邮件内容（Markdown 格式）
 */
function generateEmailContent(date, items, lang) {
    const formattedDate = new Date(date).toLocaleDateString(
        lang === 'zh' ? 'zh-CN' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' }
    );

    const isZh = lang === 'zh';

    let content = '';

    // 标题区域
    if (isZh) {
        content += `新闻胶囊更新了 **${items.length}** 条内容，快来看看吧：\n\n`;
    } else {
        content += `News Capsule updated with **${items.length}** new stories, check them out:\n\n`;
    }

    // 文章标题列表
    items.forEach((item, index) => {
        const title = item.originalTitle || item.title;
        content += `${index + 1}. ${title}\n`;
    });

    content += '\n---\n\n';

    // CTA 按钮
    const readMoreUrl = `${SITE_URL}?date=${date}&lang=${lang}`;
    if (isZh) {
        content += `👉 [点击阅读完整内容](${readMoreUrl})`;
    } else {
        content += `👉 [Read the full digest](${readMoreUrl})`;
    }

    return content;
}

/**
 * 发送邮件到 Buttondown
 * @param {string} subject - 邮件主题
 * @param {string} body - 邮件内容
 * @param {string} status - 状态：'draft' 或 'sent'
 * @param {string} lang - 目标语言：'zh' 或 'en'
 */
async function sendToButtondown(subject, body, status = 'draft', lang = null) {
    if (!BUTTONDOWN_API_KEY) {
        throw new Error('BUTTONDOWN_API_KEY not configured');
    }

    const emailData = {
        subject,
        body,
        status,
    };

    // 如果指定了语言，使用 included_tags 筛选
    if (lang) {
        emailData.included_tags = [`lang-${lang}`];
    }

    const response = await fetch('https://api.buttondown.email/v1/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Token ${BUTTONDOWN_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Buttondown API error: ${response.status}`);
    }

    return response.json();
}

/**
 * POST - 发送 Newsletter
 */
export async function POST(request) {
    try {
        const { date, lang = 'zh', sendNow = false } = await request.json();

        if (!date) {
            return NextResponse.json(
                { error: '请指定日期' },
                { status: 400 }
            );
        }

        // 获取已发布内容
        const items = await getPublishedItems(date, lang);

        if (items.length === 0) {
            return NextResponse.json(
                { error: '该日期没有已发布的内容' },
                { status: 400 }
            );
        }

        // 格式化日期用于邮件主题
        const formattedDate = new Date(date).toLocaleDateString(
            lang === 'zh' ? 'zh-CN' : 'en-US',
            { month: 'numeric', day: 'numeric' }
        );

        // 生成邮件
        const subject = lang === 'zh'
            ? `📬 新闻胶囊 · ${formattedDate} 更新`
            : `📬 News Capsule · ${formattedDate} Update`;

        const body = generateEmailContent(date, items, lang);

        // 发送到 Buttondown（只发给对应语言偏好的订阅者）
        const result = await sendToButtondown(
            subject,
            body,
            sendNow ? 'sent' : 'draft',
            lang  // 传递语言，用于筛选订阅者
        );

        const langLabel = lang === 'zh' ? '中文' : 'English';
        return NextResponse.json({
            success: true,
            message: sendNow
                ? `邮件已发送给 ${langLabel} 订阅者`
                : `邮件草稿已创建（目标：${langLabel} 订阅者），请到 Buttondown 后台确认发送`,
            emailId: result.id,
            subject,
            itemCount: items.length,
            targetLanguage: lang,
        });

    } catch (error) {
        console.error('Send newsletter error:', error);
        return NextResponse.json(
            { error: error.message || '发送失败' },
            { status: 500 }
        );
    }
}

/**
 * GET - 预览邮件内容
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const lang = searchParams.get('lang') || 'zh';

        if (!date) {
            return NextResponse.json(
                { error: '请指定日期' },
                { status: 400 }
            );
        }

        const items = await getPublishedItems(date, lang);

        if (items.length === 0) {
            return NextResponse.json(
                { error: '该日期没有已发布的内容' },
                { status: 400 }
            );
        }

        const formattedDate = new Date(date).toLocaleDateString(
            lang === 'zh' ? 'zh-CN' : 'en-US',
            { month: 'numeric', day: 'numeric' }
        );

        const subject = lang === 'zh'
            ? `📬 新闻胶囊 · ${formattedDate} 更新`
            : `📬 News Capsule · ${formattedDate} Update`;

        const body = generateEmailContent(date, items, lang);

        return NextResponse.json({
            subject,
            body,
            itemCount: items.length,
            items: items.map(item => ({
                title: item.originalTitle || item.title,
                sourceName: item.sourceName
            }))
        });

    } catch (error) {
        console.error('Preview newsletter error:', error);
        return NextResponse.json(
            { error: error.message || '预览失败' },
            { status: 500 }
        );
    }
}
