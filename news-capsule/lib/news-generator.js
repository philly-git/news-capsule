import OpenAI from 'openai';
import { readJSON, writeJSON, readSettings } from './storage.js';
import { DEFAULT_PROMPT_ZH, DEFAULT_PROMPT_EN } from './prompts.js';

/**
 * 获取 OpenAI 客户端
 */
export async function getOpenAIClient() {
    const settings = await readSettings();
    const apiKey = settings.openai?.apiKey || process.env.OPENAI_API_KEY;
    return new OpenAI({ apiKey });
}

/**
 * 读取保存的 Prompt 配置
 */
export async function getPromptConfig(lang) {
    try {
        const settings = await readSettings();
        if (settings.promptConfig && settings.promptConfig[lang]) {
            return settings.promptConfig[lang];
        }
    } catch (e) {
        console.error('Error reading prompt config:', e);
    }
    return {
        model: 'gpt-4o-mini',
        prompt: lang === 'zh' ? DEFAULT_PROMPT_ZH : DEFAULT_PROMPT_EN
    };
}

/**
 * 生成单条新闻摘要
 */
export async function generateSummary(item, lang) {
    const openai = await getOpenAIClient();
    const config = await getPromptConfig(lang);
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

/**
 * 核心逻辑：根据传入的条目列表生成新闻摘要并保存
 * 用于发布流程
 */
export async function generateNewsFromItems({ items, date, language }) {
    if (!items || items.length === 0) {
        throw new Error('No items provided');
    }

    const lang = language || 'zh';
    const publishDate = date || new Date().toISOString().split('T')[0];

    console.log(`[Generator] Generating ${lang} summaries for ${items.length} items...`);

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
    const results = [];

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
            const processedItem = {
                id: item.id || `news-${Date.now()}-${i}`,
                // 新格式
                editorNote: summary.editorNote,
                keyPoints: summary.keyPoints,
                readOriginal: summary.readOriginal,
                shortLabel: summary.shortLabel, // 导航标签
                // 通用字段
                originalTitle: item.title,
                link: item.link,
                pubDate: item.pubDate,
                wordCount: item.wordCount
            };
            processedItems.push(processedItem);

            // 避免 API 限速
            await new Promise(r => setTimeout(r, 300));
        }

        // 保存到 feeds/{sourceId}/{date}-{lang}.json
        const filePath = `feeds/${sourceId}/${publishDate}-${lang}.json`;

        const data = {
            sourceId,
            date: publishDate,
            language: lang,
            publishedAt: new Date().toISOString(),
            items: processedItems
        };

        // 如果文件已存在，追加而不是覆盖（或合并更新？按需求是追加，但要注意去重）
        const existingData = await readJSON(filePath);
        if (existingData) {
            // 简单的追加逻辑，理想情况下应该按 ID 去重
            existingData.items = [...existingData.items, ...processedItems];
            existingData.publishedAt = new Date().toISOString();
            await writeJSON(filePath, existingData);
        } else {
            await writeJSON(filePath, data);
        }

        console.log(`[Generator] Saved ${processedItems.length} items to ${filePath}`);
        totalProcessed += processedItems.length;
        results.push(...processedItems);
    }

    return {
        success: true,
        count: totalProcessed,
        date: publishDate,
        language: lang,
        items: results
    };
}
