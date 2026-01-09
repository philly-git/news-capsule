import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { convert } from 'html-to-text';
import { getEnabledSources, getAllSources } from '../../../../lib/sources.js';
import { addItemsToSource, convertNewToPending } from '../../../../lib/feeds.js';

const parser = new Parser({
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }
});

// 处理 rsshub:// 协议
function resolveUrl(url) {
    if (url.startsWith('rsshub://')) {
        const rsshubPath = url.replace('rsshub://', '');
        return `https://rsshub.rssforever.com/${rsshubPath}`;
    }
    return url;
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

// 解码 HTML 实体（如 &mdash; &amp; &lt; &gt; 等）
function decodeHtmlEntities(text) {
    if (!text) return '';
    const entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&mdash;': '\u2014',  // —
        '&ndash;': '\u2013',  // –
        '&nbsp;': ' ',
        '&hellip;': '\u2026', // …
        '&lsquo;': '\u2018',  // '
        '&rsquo;': '\u2019',  // '
        '&ldquo;': '\u201C',  // "
        '&rdquo;': '\u201D',  // "
        '&bull;': '\u2022',   // •
        '&copy;': '\u00A9',   // ©
        '&reg;': '\u00AE',    // ®
        '&trade;': '\u2122'   // ™
    };

    // 先处理命名实体
    let result = text;
    for (const [entity, char] of Object.entries(entities)) {
        result = result.split(entity).join(char);
    }

    // 处理数字实体（如 &#8212;）
    result = result.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    result = result.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

    return result;
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

// 抓取单个 RSS 源
async function fetchSingleSource(source, timeWindowHours = 48) {
    try {
        const actualUrl = resolveUrl(source.url);
        const feed = await parser.parseURL(actualUrl);

        // 根据时间窗口参数计算截止时间
        const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

        const items = (feed.items || [])
            .filter(item => {
                const pubDate = new Date(item.pubDate || item.isoDate);
                if (isNaN(pubDate.getTime())) return true;
                return pubDate > cutoffTime;
            })
            .slice(0, 15)
            .map(item => {
                const content = item['content:encoded'] || item.content || item.contentSnippet || item.description || '';
                return {
                    title: decodeHtmlEntities(item.title),
                    link: item.link,
                    content,
                    pubDate: item.pubDate || item.isoDate,
                    wordCount: countWords(content, source.language),
                    sourceName: source.name,
                    sourceLanguage: source.language
                };
            });

        // 使用新的 feeds 模块按源存储
        const result = await addItemsToSource(source.id, items);

        return {
            success: true,
            sourceId: source.id,
            name: source.name,
            count: items.length,
            added: result.addedCount,
            updated: result.updatedCount,
            totalItems: result.totalItems
        };
    } catch (error) {
        return {
            success: false,
            sourceId: source.id,
            name: source.name,
            count: 0,
            error: error.message
        };
    }
}

export async function POST(request) {
    try {
        const { sourceNames, timeWindowHours = 48 } = await request.json();

        // 验证时间窗口参数（只允许预设值）
        const validHours = [24, 48, 168].includes(timeWindowHours) ? timeWindowHours : 48;

        // 获取所有源（包括禁用的，但只抓取指定的）
        const allSources = await getAllSources();
        const enabledSources = await getEnabledSources();

        // 筛选要抓取的源
        let sourcesToFetch = enabledSources;
        if (sourceNames && sourceNames.length > 0) {
            sourcesToFetch = allSources.filter(s => sourceNames.includes(s.name));
        }

        if (sourcesToFetch.length === 0) {
            return NextResponse.json({ error: '没有找到指定的信息源' }, { status: 400 });
        }

        // 刷新前：将所有源的 new 状态转为 pending
        await convertNewToPending();

        // 并行抓取
        const results = await Promise.all(
            sourcesToFetch.map(source => fetchSingleSource(source, validHours))
        );

        // 返回结果
        const stats = {};
        let totalNewItems = 0;
        let totalUpdatedItems = 0;

        for (const r of results) {
            stats[r.name] = {
                success: r.success,
                count: r.count,
                added: r.added || 0,
                updated: r.updated || 0,
                totalItems: r.totalItems || 0,
                error: r.error || null
            };
            if (r.success) {
                totalNewItems += r.added || 0;
                totalUpdatedItems += r.updated || 0;
            }
        }

        return NextResponse.json({
            success: true,
            fetchedAt: new Date().toISOString(),
            totalNewItems,
            totalUpdatedItems,
            stats
        });

    } catch (error) {
        console.error('Fetch RSS error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
