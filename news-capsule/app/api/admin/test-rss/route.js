import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { convert } from 'html-to-text';

// 创建 RSS 解析器
const parser = new Parser({
    timeout: 30000, // 增加超时时间，某些源响应较慢
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }
});

// 检测语言
function detectLanguage(text) {
    if (!text) return 'unknown';
    // 简单的中文检测：如果包含较多中文字符则判定为中文
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const totalChars = text.length;
    return chineseChars / totalChars > 0.1 ? 'zh' : 'en';
}

// 使用 html-to-text 提取纯文本
function extractPlainText(html) {
    if (!html) return '';
    return convert(html, {
        wordwrap: false,
        selectors: [
            { selector: 'a', options: { ignoreHref: true } },
            { selector: 'img', format: 'skip' },
            { selector: 'script', format: 'skip' },
            { selector: 'style', format: 'skip' }
        ]
    }).trim();
}

// 计算字数（英文返回单词数，中文返回字符数）
function countWords(text, language = 'en') {
    if (!text) return 0;
    const plainText = extractPlainText(text);

    if (language === 'zh') {
        // 中文：统计字符数（排除空格和标点）
        return plainText.replace(/[\s\p{P}]/gu, '').length;
    } else {
        // 英文：统计单词数
        return plainText.split(/\s+/).filter(w => w.length > 0).length;
    }
}

export async function POST(request) {
    try {
        let { url } = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: '请提供 RSS 链接' },
                { status: 400 }
            );
        }

        // 处理 rsshub:// 协议，转换为实际 URL
        // rsshub://sspai/index -> https://rsshub.app/sspai/index
        let actualUrl = url;
        let isRSSHub = false;

        if (url.startsWith('rsshub://')) {
            const path = url.replace('rsshub://', '');
            // 使用可用的公共 RSSHub 实例
            actualUrl = `https://rsshub.rssforever.com/${path}`;
            isRSSHub = true;
        }

        // 解析 RSS
        const feed = await parser.parseURL(actualUrl);

        // 计算 7 天前的时间
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 过滤最近 7 天的条目
        const recentItems = (feed.items || []).filter(item => {
            if (!item.pubDate && !item.isoDate) return true; // 如果没有日期，保留
            const pubDate = new Date(item.pubDate || item.isoDate);
            return pubDate >= sevenDaysAgo;
        });

        // 先检测语言（使用前几条标题）
        const sampleText = recentItems.slice(0, 5).map(i => i.title).join(' ');
        const detectedLanguage = detectLanguage(sampleText);

        // 处理条目
        const items = recentItems.map((item, index) => {
            // 优先使用 content:encoded（完整内容），其次才是 content（可能只是摘要）
            const contentEncoded = item['content:encoded'] || '';
            const content = item.content || '';
            const description = item.description || '';
            const summary = item.summary || '';

            // 选择最长的内容作为正文
            const bestContent = [contentEncoded, content, description, summary]
                .sort((a, b) => b.length - a.length)[0];
            const wordCount = countWords(bestContent, detectedLanguage);

            return {
                index,
                title: item.title || '无标题',
                link: item.link || '',
                pubDate: item.pubDate || item.isoDate || null,
                wordCount,
                contentPreview: extractPlainText(bestContent).substring(0, 200),
                // 数据结构：每个字段的字符长度
                structure: {
                    'content:encoded': contentEncoded.length,
                    'content': content.length,
                    'description': description.length,
                    'summary': summary.length
                }
            };
        });

        // 统计
        const totalWordCount = items.reduce((sum, item) => sum + item.wordCount, 0);
        const avgWordCount = items.length > 0 ? Math.round(totalWordCount / items.length) : 0;

        // 分析数据结构（使用第一条内容作为样本）
        const sampleItem = feed.items[0] || {};
        const availableFields = Object.keys(sampleItem);
        const hasFullContent = items.some(i => i.wordCount > 500);

        return NextResponse.json({
            success: true,
            feedInfo: {
                title: feed.title || '未知源',
                description: feed.description || '',
                link: feed.link || actualUrl,
                detectedLanguage,
                // 如果是 rsshub:// 协议，显示转换信息
                isRSSHub,
                actualUrl: isRSSHub ? actualUrl : undefined,
            },
            // 数据结构分析
            structureAnalysis: {
                availableFields,
                hasFullContent,
                recommendation: hasFullContent
                    ? '✅ 该源提供完整正文，适合使用'
                    : '⚠️ 该源可能仅提供摘要（平均字数较少），建议查看下方结构详情',
                sampleStructure: items[0]?.structure || {}
            },
            stats: {
                totalItems: items.length,
                totalWordCount,
                avgWordCount,
                dateRange: {
                    from: sevenDaysAgo.toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0]
                }
            },
            items
        });

    } catch (error) {
        console.error('RSS test error:', error);
        return NextResponse.json(
            {
                error: '无法解析该 RSS 链接',
                details: error.message
            },
            { status: 500 }
        );
    }
}
