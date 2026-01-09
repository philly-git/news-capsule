import OpenAI from 'openai';
import { readSettings, readJSON, writeJSON } from './storage.js';

// 默认 Prompt 模板
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
