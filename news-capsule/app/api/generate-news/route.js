import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { readSettings, readJSON, writeJSON } from '@/lib/storage';
import { getOpenAIClient, generateSummary, generateNewsFromItems } from '@/lib/news-generator';

// RSS信息源配置
const RSS_SOURCES = [
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', language: 'en' },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', language: 'en' },
    { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', language: 'en' },
    { name: 'Wired', url: 'https://www.wired.com/feed/rss', language: 'en' },
    { name: '36氪', url: 'https://36kr.com/feed', language: 'zh' },
];

const parser = new Parser({
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsCapsule/1.0)' }
});

const FILTER_PROMPT = `你是科技新闻筛选专家。从以下新闻中选出最重要的7-10条。
筛选标准：大公司动向、重大产品发布、大额融资、AI突破、行业政策。
返回选中新闻的索引列表，格式如：[0, 2, 5, 7]

新闻列表：
{news_list}`;

async function fetchAllNews() {
    const allNews = [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const source of RSS_SOURCES) {
        try {
            const feed = await parser.parseURL(source.url);
            const items = feed.items
                .filter(item => new Date(item.pubDate || item.isoDate) > oneDayAgo)
                .slice(0, 8)
                .map(item => ({
                    originalTitle: item.title,
                    content: item.contentSnippet || item.content || '',
                    link: item.link,
                    pubDate: item.pubDate,
                    source: { name: source.name, url: item.link, language: source.language }
                }));
            allNews.push(...items);
        } catch (e) {
            console.error(`Error fetching ${source.name}:`, e.message);
        }
    }
    return allNews;
}

async function filterNews(allNews) {
    const openai = await getOpenAIClient();
    const newsList = allNews.map((n, i) => `${i}. [${n.source.name}] ${n.originalTitle}`).join('\n');

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: FILTER_PROMPT.replace('{news_list}', newsList) }],
            temperature: 0.1,
        });
        const match = response.choices[0].message.content.match(/\[[\d,\s]+\]/);
        if (match) {
            return JSON.parse(match[0]).map(i => allNews[i]).filter(Boolean);
        }
    } catch (e) {
        console.error('Filter error:', e.message);
    }
    return allNews.slice(0, 10);
}

export async function GET(request) {
    // 验证Cron密钥
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // 允许本地开发调用
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'zh';

    try {
        console.log('Starting news generation...');

        const allNews = await fetchAllNews();
        if (allNews.length === 0) {
            return NextResponse.json({ error: 'No news fetched' }, { status: 500 });
        }

        const filtered = await filterNews(allNews);
        const newsWithSummary = [];

        for (let i = 0; i < filtered.length; i++) {
            const summary = await generateSummary(filtered[i], lang);
            newsWithSummary.push({
                id: `news-${Date.now()}-${i}`,
                title: summary.editorNote, // 注意：旧格式可能用 title
                highlights: summary.keyPoints,
                impact: summary.readOriginal, // 映射到旧字段？视前端需求而定，这里保持原样可能有风险，但GET主要用于cron
                source: filtered[i].source,
                ...summary // 扩展新字段
            });
            await new Promise(r => setTimeout(r, 300));
        }

        const today = new Date().toISOString().split('T')[0];
        const data = {
            date: today,
            publishedAt: new Date().toISOString(),
            language: lang,
            news: newsWithSummary
        };

        // 保存到存储（按日期+语言存储）
        await writeJSON(`news/${today}-${lang}.json`, data);

        return NextResponse.json({
            success: true,
            count: newsWithSummary.length,
            date: today
        });
    } catch (error) {
        console.error('Generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: 处理印刷厂传入的条目，生成摘要
export async function POST(request) {
    try {
        const body = await request.json();
        const result = await generateNewsFromItems(body);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Generate POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
