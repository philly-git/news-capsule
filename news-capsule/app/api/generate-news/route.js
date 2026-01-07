import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FILTER_PROMPT = `你是科技新闻筛选专家。从以下新闻中选出最重要的7-10条。
筛选标准：大公司动向、重大产品发布、大额融资、AI突破、行业政策。
返回选中新闻的索引列表，格式如：[0, 2, 5, 7]

新闻列表：
{news_list}`;

const SUMMARY_PROMPT_ZH = `分析以下新闻，生成精炼摘要。返回JSON格式：
{"title":"一句话标题(15-30字)","highlights":["要点1","要点2","要点3"],"impact":"影响分析(1-2句)"}

新闻: {title}
内容: {content}
来源: {source}`;

const SUMMARY_PROMPT_EN = `Analyze this news and generate a summary. Return JSON:
{"title":"headline (15-30 words)","highlights":["point1","point2","point3"],"impact":"impact analysis"}

News: {title}
Content: {content}
Source: {source}`;

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
    const newsList = allNews.map((n, i) => `${i}. [${n.source.name}] ${n.originalTitle}`).join('\n');

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: FILTER_PROMPT.replace('{news_list}', newsList) }],
            temperature: 0.3,
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

async function generateSummary(item, lang) {
    const prompt = (lang === 'zh' ? SUMMARY_PROMPT_ZH : SUMMARY_PROMPT_EN)
        .replace('{title}', item.originalTitle)
        .replace('{content}', item.content.slice(0, 1500))
        .replace('{source}', item.source.name);

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            response_format: { type: 'json_object' }
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (e) {
        return { title: item.originalTitle, highlights: [item.content.slice(0, 100)], impact: '' };
    }
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
                title: summary.title,
                highlights: summary.highlights,
                impact: summary.impact,
                source: filtered[i].source,
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

        // 保存到文件（按日期+语言存储）
        const dataDir = path.join(process.cwd(), 'data', 'news');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, `${today}-${lang}.json`), JSON.stringify(data, null, 2));

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
