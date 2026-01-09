import Parser from 'rss-parser';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { convert } from 'html-to-text';
import {
    SUMMARY_PROMPT_ZH,
    SUMMARY_PROMPT_EN,
    DEDUPE_PROMPT
} from './config.js';

const parser = new Parser({
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsCapsule/1.0)'
    }
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const DATA_DIR = path.join(process.cwd(), 'data', 'feeds');
const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json');

/**
 * 读取设置文件（包含保存的 Prompt 配置）
 */
function readSettings() {
    if (!fs.existsSync(SETTINGS_PATH)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    } catch (e) {
        console.error('Failed to read settings.json:', e.message);
        return {};
    }
}

/**
 * 获取指定语言的 Prompt 配置
 * 优先使用 settings.json 中保存的配置，否则使用默认值
 */
function getPromptConfig(language) {
    const settings = readSettings();
    const savedConfig = settings.promptConfig?.[language];

    if (savedConfig?.prompt && savedConfig?.model) {
        console.log(`📋 Using saved prompt config for ${language}: model=${savedConfig.model}`);
        return {
            model: savedConfig.model,
            prompt: savedConfig.prompt
        };
    }

    // 使用默认值
    console.log(`📋 Using default prompt config for ${language}`);
    return {
        model: 'gpt-4o-mini',
        prompt: language === 'en' ? SUMMARY_PROMPT_EN : SUMMARY_PROMPT_ZH
    };
}

/**
 * 读取统一的源配置文件
 */
function readSourcesFile() {
    const sourcesPath = path.join(process.cwd(), 'data', 'sources.json');
    if (!fs.existsSync(sourcesPath)) {
        return { sources: [] };
    }
    try {
        return JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
    } catch (e) {
        console.error('Failed to read sources.json:', e);
        return { sources: [] };
    }
}

/**
 * 处理 rsshub:// 协议
 */
function resolveUrl(url) {
    if (url.startsWith('rsshub://')) {
        const rsshubPath = url.replace('rsshub://', '');
        return `https://rsshub.rssforever.com/${rsshubPath}`;
    }
    return url;
}

/**
 * 根据目标语言筛选信息源
 */
function getSourcesForLanguage(language) {
    const data = readSourcesFile();
    const enabledSources = data.sources.filter(s => s.enabled);

    if (language === 'en') {
        return enabledSources.filter(s => s.language === 'en');
    }
    return enabledSources;
}

/**
 * 读取本地缓存的 items.json（包含完整 HTML 正文）
 */
function readCachedItems(sourceId) {
    const itemsPath = path.join(DATA_DIR, sourceId, 'items.json');
    if (!fs.existsSync(itemsPath)) {
        return null;
    }
    try {
        const data = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));
        return data.items || [];
    } catch (e) {
        console.error(`Failed to read cached items for ${sourceId}:`, e.message);
        return null;
    }
}

/**
 * 获取新闻数据（优先使用本地缓存的完整数据）
 */
async function fetchAllNews(sources) {
    const allNews = [];
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000);

    for (const source of sources) {
        try {
            console.log(`Loading from ${source.name}...`);

            // 优先读取本地缓存（包含完整 HTML 正文）
            const cachedItems = readCachedItems(source.id);

            if (cachedItems && cachedItems.length > 0) {
                const recentItems = cachedItems
                    .filter(item => {
                        const pubDate = new Date(item.pubDate);
                        if (isNaN(pubDate.getTime())) return true;
                        return pubDate > cutoffTime;
                    })
                    .slice(0, 20)
                    .map(item => ({
                        originalTitle: item.title,
                        content: item.content || '',
                        link: item.link,
                        pubDate: item.pubDate,
                        wordCount: item.wordCount, // 使用缓存的字数
                        qualityFlags: item.qualityFlags, // 保留质量标记
                        source: {
                            id: source.id,
                            name: source.name,
                            url: item.link,
                            language: source.language
                        }
                    }));

                allNews.push(...recentItems);
                console.log(`  ✓ Got ${recentItems.length} items from cache (with full content)`);
            } else {
                // 没有缓存，从 RSS 源抓取
                console.log(`  ⚠ No cache found, fetching from RSS...`);
                const actualUrl = resolveUrl(source.url);
                const feed = await parser.parseURL(actualUrl);

                const recentItems = feed.items
                    .filter(item => {
                        const pubDate = new Date(item.pubDate || item.isoDate);
                        if (isNaN(pubDate.getTime())) return true;
                        return pubDate > cutoffTime;
                    })
                    .slice(0, 20)
                    .map(item => ({
                        originalTitle: item.title,
                        content: item.content || item.contentSnippet || item.description || '',
                        link: item.link,
                        pubDate: item.pubDate || item.isoDate,
                        source: {
                            id: source.id,
                            name: source.name,
                            url: item.link,
                            language: source.language
                        }
                    }));

                allNews.push(...recentItems);
                console.log(`  ✓ Got ${recentItems.length} items from RSS`);
            }
        } catch (error) {
            console.error(`Error loading ${source.name}:`, error.message);
        }
    }

    console.log(`\nTotal loaded: ${allNews.length} news items`);
    return allNews;
}

/**
 * 数据标准化：从 RSS 原始数据中提取干净的结构化信息
 * - 从 HTML 提取纯文本
 * - 计算真实字数（优先使用缓存值）
 * - 统一数据格式
 */
function normalizeItem(item) {
    // 从 HTML 提取纯文本
    const htmlContent = item.content || item.contentSnippet || item.description || '';
    const plainText = convert(htmlContent, {
        wordwrap: false,
        selectors: [
            { selector: 'a', options: { ignoreHref: true } },
            { selector: 'img', format: 'skip' },
            { selector: 'script', format: 'skip' },
            { selector: 'style', format: 'skip' }
        ]
    }).trim();

    // 计算字数：优先使用缓存的值，否则自己计算
    let wordCount = item.wordCount;
    if (!wordCount) {
        const isEnglish = item.source?.language === 'en';
        if (isEnglish) {
            wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;
        } else {
            wordCount = plainText.replace(/[\s\p{P}]/gu, '').length;
        }
    }

    return {
        ...item,
        plainText,
        wordCount,
        // 保留原始 HTML 以备后用
        rawHtml: htmlContent
    };
}

/**
 * 使用AI检测并去除重复新闻（基于标题，在摘要生成前执行）
 */
async function deduplicateByTitle(newsItems) {
    if (newsItems.length <= 1) return newsItems;

    // 构建标题列表
    const newsList = newsItems.map((n, i) =>
        `${i}. [${n.source.name}] ${n.originalTitle}`
    ).join('\n');

    const prompt = DEDUPE_PROMPT.replace('{news_list}', newsList);

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
        });

        const content = response.choices[0].message.content;
        const match = content.match(/\[[\d,\s]+\]/);

        if (match) {
            const indices = JSON.parse(match[0]);
            const deduped = indices.map(i => newsItems[i]).filter(Boolean);
            console.log(`\n🔄 Deduplication: ${newsItems.length} → ${deduped.length} items`);
            return deduped;
        }
    } catch (error) {
        console.error('Error deduplicating news:', error.message);
    }

    return newsItems;
}

/**
 * 计算阅读时间（基于字数）
 */
function calculateReadTime(wordCount, language) {
    if (language === 'en') {
        // 英文：约 300 词/分钟
        return Math.max(1, Math.ceil(wordCount / 300));
    } else {
        // 中文：约 800 字/分钟
        return Math.max(1, Math.ceil(wordCount / 800));
    }
}

/**
 * 生成摘要（使用标准化后的纯文本）
 */
async function generateSummary(newsItem, targetLanguage) {
    // 使用标准化后的纯文本，而非原始 HTML
    const contentForAI = newsItem.plainText || newsItem.content || '';

    // 获取保存的 Prompt 配置（或使用默认值）
    const config = getPromptConfig(targetLanguage);

    const prompt = config.prompt
        .replace('{title}', newsItem.originalTitle)
        .replace('{content}', contentForAI.slice(0, 6000)) // 纯文本可以传更多
        .replace('{source}', newsItem.source.name);

    try {
        const response = await openai.chat.completions.create({
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' }
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error('Error generating summary:', error.message);
        return {
            editorNote: newsItem.originalTitle,
            keyPoints: [contentForAI.slice(0, 100) + '...'],
            readOriginal: { score: 3, reason: '无法生成评估' }
        };
    }
}

/**
 * 按源分组处理新闻
 */
async function processNewsBySource(allNews, targetLanguage) {
    const newsBySource = {};

    // 按源分组
    for (const item of allNews) {
        const sourceId = item.source.id;
        if (!newsBySource[sourceId]) {
            newsBySource[sourceId] = {
                id: sourceId,
                name: item.source.name,
                language: item.source.language,
                items: []
            };
        }
        newsBySource[sourceId].items.push(item);
    }

    // 为每个源的每条新闻生成摘要
    for (const sourceId of Object.keys(newsBySource)) {
        const sourceData = newsBySource[sourceId];
        console.log(`\n📰 Processing ${sourceData.name} (${sourceData.items.length} items)...`);

        const processedItems = [];
        let skippedCount = 0;

        for (let i = 0; i < sourceData.items.length; i++) {
            const rawItem = sourceData.items[i];

            // 跳过被标记为不适合总结的条目
            if (rawItem.qualityFlags?.skipSummary) {
                skippedCount++;
                console.log(`  [${i + 1}/${sourceData.items.length}] ⏭ SKIP: ${rawItem.originalTitle.slice(0, 40)}... (${rawItem.qualityFlags.reasons.join(', ')})`);
                continue;
            }

            // 数据标准化：提取纯文本、计算字数
            const item = normalizeItem(rawItem);
            console.log(`  [${i + 1}/${sourceData.items.length}] ${item.originalTitle.slice(0, 40)}... (${item.wordCount} 字)`);

            const summary = await generateSummary(item, targetLanguage);
            const readTime = calculateReadTime(item.wordCount, item.source.language);

            processedItems.push({
                id: `${sourceId}-${Date.now()}-${i}`,
                title: summary.title,
                summary: summary.summary,
                readOriginalRecommendation: summary.readOriginalRecommendation,
                readTime: targetLanguage === 'zh' ? `${readTime} 分钟` : `${readTime} min`,
                source: {
                    name: item.source.name,
                    url: item.source.url,
                    language: item.source.language
                },
                originalTitle: item.originalTitle,
                pubDate: item.pubDate
            });

            // 避免 API 限流
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (skippedCount > 0) {
            console.log(`  ⏭ Skipped ${skippedCount} items due to quality filter`);
        }

        newsBySource[sourceId].items = processedItems;
    }

    return newsBySource;
}

/**
 * 保存按源分组的数据
 */
function saveNewsBySource(newsBySource, date, language) {
    for (const sourceId of Object.keys(newsBySource)) {
        const sourceDir = path.join(DATA_DIR, sourceId);
        if (!fs.existsSync(sourceDir)) {
            fs.mkdirSync(sourceDir, { recursive: true });
        }

        const outputPath = path.join(sourceDir, `${date}-${language}.json`);
        const data = {
            date,
            language,
            source: {
                id: sourceId,
                name: newsBySource[sourceId].name,
                language: newsBySource[sourceId].language
            },
            items: newsBySource[sourceId].items,
            generatedAt: new Date().toISOString()
        };

        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`📁 Saved: ${outputPath} (${data.items.length} items)`);
    }
}

/**
 * 生成当日新闻数据
 */
async function generateDailyNews(language = 'zh') {
    console.log('=== News Capsule - Daily News Generator (Simplified) ===\n');
    console.log(`Language: ${language === 'zh' ? '中文' : 'English'}\n`);

    // 1. 根据语言选择信息源
    const sources = getSourcesForLanguage(language);
    console.log(`Using ${sources.length} sources: ${sources.map(s => s.name).join(', ')}\n`);

    if (sources.length === 0) {
        console.log('No enabled sources. Exiting.');
        return null;
    }

    // 2. 抓取所有新闻（使用RSS正文）
    const allNews = await fetchAllNews(sources);

    if (allNews.length === 0) {
        console.log('No news fetched. Exiting.');
        return null;
    }

    // 3. 基于标题去重（在AI摘要前）
    console.log('\nDeduplicating by title...');
    const dedupedNews = await deduplicateByTitle(allNews);

    // 4. 按源分组处理，生成摘要
    const newsBySource = await processNewsBySource(dedupedNews, language);

    // 5. 保存数据
    const today = new Date().toISOString().split('T')[0];
    saveNewsBySource(newsBySource, today, language);

    // 统计
    let totalItems = 0;
    for (const sourceId of Object.keys(newsBySource)) {
        totalItems += newsBySource[sourceId].items.length;
    }

    console.log(`\n✅ Generated ${totalItems} news items across ${Object.keys(newsBySource).length} sources`);

    return newsBySource;
}

// 主函数
const language = process.argv[2] || 'zh';
generateDailyNews(language).catch(console.error);
