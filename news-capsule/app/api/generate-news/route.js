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

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json');

const FILTER_PROMPT = `你是科技新闻筛选专家。从以下新闻中选出最重要的7-10条。
筛选标准：大公司动向、重大产品发布、大额融资、AI突破、行业政策。
返回选中新闻的索引列表，格式如：[0, 2, 5, 7]

新闻列表：
{news_list}`;

// 默认 Prompt 模板（与 settings.json 保持一致，0-3分制）
// 注意：实际使用时会优先读取 settings.json 中保存的配置
const DEFAULT_PROMPT_ZH = `## 角色设定

你是一个专业的新闻编辑。你的读者是一群想要快速掌握新闻关键信息的知识工作者。请你对下面的新闻进行深入阅读后进行总结，并评估在读完"摘要（editorNote + keyPoints）"后是否仍值得阅读原文。

**重要：**全程使用中文输出。

---

## 输出要求

### 1) editorNote（编辑概要）
站在专业编辑角度，用一句话写出**最重要的结论 + 关键实体**：
* 30–50 个中文字
* 尽量包含：主体 + 关键动作/变化 + 至少 1 个具体要素

### 2) keyPoints（关键要点）
提取 3–4 个核心要点，每个要点：
* 一句话，15–30 个中文字
* 必须包含可核查的具体信息

### 3) readOriginal（阅读原文评估）
#### score（0-3分）
* 3：不可替代的一手/独家材料
* 2：高密度参考资料
* 1：关键语境补充
* 0：几乎无增量

#### reason
30–50 个中文字，具体说明原文有什么摘要没有的内容

#### whoShouldRead
20–30 个中文字，说明什么读者建议阅读原文

---

新闻标题: {title}
新闻内容: {content}
来源: {source}`;

const DEFAULT_PROMPT_EN = `## Role

You are a professional news editor. Summarize the news below and assess how much unique value remains in the original article after reading your summary.

**IMPORTANT:** Output everything in **English**.

---

## Output Requirements

### 1) editorNote
A single-sentence editorial note with key entities (20–35 words)

### 2) keyPoints
Extract 3–4 key points (12–22 words each, include verifiable details)

### 3) readOriginal
#### score (0-3)
* 3: Irreplaceable primary/exclusive material
* 2: Dense reference material
* 1: Key nuance and boundaries
* 0: Little to no incremental value

#### reason
20–35 words, name concrete artifacts the original contains

#### whoShouldRead
12–20 words, specify reader background/role

---

News title: {title}
News content: {content}
Source: {source}`;

/**
 * 读取保存的 Prompt 配置
 */
function getPromptConfig(lang) {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
            if (settings.promptConfig && settings.promptConfig[lang]) {
                return settings.promptConfig[lang];
            }
        }
    } catch (e) {
        console.error('Error reading prompt config:', e);
    }
    return {
        model: 'gpt-4o-mini',
        prompt: lang === 'zh' ? DEFAULT_PROMPT_ZH : DEFAULT_PROMPT_EN
    };
}

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

async function generateSummary(item, lang) {
    const config = getPromptConfig(lang);
    const prompt = config.prompt
        .replace('{title}', item.originalTitle)
        .replace('{content}', item.content.slice(0, 3000))
        .replace('{source}', item.source?.name || 'Unknown');

    try {
        const response = await openai.chat.completions.create({
            model: config.model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' }
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (e) {
        console.error('Generate summary error:', e);
        // 返回兜底格式
        return {
            editorNote: item.originalTitle,
            keyPoints: [item.content.slice(0, 100)],
            readOriginal: { score: 2, reason: '摘要生成失败' }
        };
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

// POST: 处理印刷厂传入的条目，生成摘要
export async function POST(request) {
    try {
        const { items, date, language } = await request.json();

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'No items provided' }, { status: 400 });
        }

        const lang = language || 'zh';
        const publishDate = date || new Date().toISOString().split('T')[0];

        console.log(`Generating ${lang} summaries for ${items.length} items...`);

        // 按源分组
        const itemsBySource = {};
        for (const item of items) {
            const sourceId = item.sourceId || 'unknown';
            if (!itemsBySource[sourceId]) {
                itemsBySource[sourceId] = [];
            }
            itemsBySource[sourceId].push(item);
        }

        let totalProcessed = 0;

        // 按源处理和保存
        for (const [sourceId, sourceItems] of Object.entries(itemsBySource)) {
            const processedItems = [];

            for (let i = 0; i < sourceItems.length; i++) {
                const item = sourceItems[i];
                // 转换格式以匹配 generateSummary 期望的结构
                const formattedItem = {
                    originalTitle: item.title,
                    content: item.content || item.plainText || '',
                    source: { name: item.sourceName, url: item.link }
                };

                const summary = await generateSummary(formattedItem, lang);
                processedItems.push({
                    id: item.id || `news-${Date.now()}-${i}`,
                    // 新格式
                    editorNote: summary.editorNote,
                    keyPoints: summary.keyPoints,
                    readOriginal: summary.readOriginal,
                    // 通用字段
                    originalTitle: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    wordCount: item.wordCount
                });

                // 避免 API 限速
                await new Promise(r => setTimeout(r, 300));
            }

            // 保存到 data/feeds/{sourceId}/{date}-{lang}.json
            const sourceDir = path.join(process.cwd(), 'data', 'feeds', sourceId);
            if (!fs.existsSync(sourceDir)) {
                fs.mkdirSync(sourceDir, { recursive: true });
            }

            const filePath = path.join(sourceDir, `${publishDate}-${lang}.json`);

            const data = {
                sourceId,
                date: publishDate,
                language: lang,
                publishedAt: new Date().toISOString(),
                items: processedItems
            };

            // 如果文件已存在，追加而不是覆盖
            if (fs.existsSync(filePath)) {
                const existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                existingData.items = [...existingData.items, ...processedItems];
                existingData.publishedAt = new Date().toISOString();
                fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
            } else {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            }

            console.log(`Saved ${processedItems.length} items to ${filePath}`);
            totalProcessed += processedItems.length;
        }

        return NextResponse.json({
            success: true,
            count: totalProcessed,
            date: publishDate,
            language: lang
        });
    } catch (error) {
        console.error('Generate POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
