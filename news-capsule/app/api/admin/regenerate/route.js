import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { convert } from 'html-to-text';
import { readSettings, readJSON, writeJSON } from '@/lib/storage';
import { getSourceItems } from '@/lib/feeds';
import { DEFAULT_PROMPT_ZH, DEFAULT_PROMPT_EN } from '@/lib/prompts.js';

// ... (省略中间代码)

/**
 * 获取 Prompt 配置
 */
async function getPromptConfig(lang) {
    try {
        const settings = await readSettings();
        if (settings.promptConfig && settings.promptConfig[lang]) {
            return settings.promptConfig[lang];
        }
    } catch (e) {
        console.error('Error reading prompt config:', e);
    }
    // 返回默认配置
    return {
        model: 'gpt-4o-mini',
        prompt: lang === 'zh' ? DEFAULT_PROMPT_ZH : DEFAULT_PROMPT_EN
    };
}

/**
 * 数据标准化：从 HTML 提取纯文本
 */
function normalizeContent(htmlContent) {
    return convert(htmlContent || '', {
        wordwrap: false,
        selectors: [
            { selector: 'a', options: { ignoreHref: true } },
            { selector: 'img', format: 'skip' },
            { selector: 'script', format: 'skip' },
            { selector: 'style', format: 'skip' }
        ]
    }).trim();
}

/**
 * 从 items.json 中查找原始文章
 */
async function findOriginalItem(sourceId, itemId, originalTitle) {
    try {
        const data = await getSourceItems(sourceId);
        const items = data.items || [];

        // 通过 ID 或标题匹配
        return items.find(item =>
            item.id === itemId ||
            item.title === originalTitle
        );
    } catch (e) {
        console.error('Error reading items.json:', e);
        return null;
    }
}

/**
 * 更新已出版内容
 */
async function updatePublishedItem(sourceId, date, lang, itemId, newData) {
    const filePath = `feeds/${sourceId}/${date}-${lang}.json`;

    try {
        const data = await readJSON(filePath);
        if (!data) {
            return false;
        }

        const items = data.items || [];

        // 找到并更新对应条目
        const index = items.findIndex(item => item.id === itemId);
        if (index === -1) {
            return false;
        }

        // 保留原有的元数据，更新生成的内容
        items[index] = {
            ...items[index],
            editorNote: newData.editorNote,
            keyPoints: newData.keyPoints,
            readOriginal: newData.readOriginal,
            shortLabel: newData.shortLabel, // 导航标签
            regeneratedAt: new Date().toISOString()
        };

        data.items = items;
        data.lastModified = new Date().toISOString();

        await writeJSON(filePath, data);
        return true;
    } catch (e) {
        console.error('Error updating published item:', e);
        return false;
    }
}

/**
 * POST - 重新生成单篇文章摘要
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { sourceId, itemId, originalTitle, date, language } = body;

        if (!sourceId || !itemId || !date || !language) {
            return NextResponse.json({
                error: 'Missing required fields: sourceId, itemId, date, language'
            }, { status: 400 });
        }

        // 1. 从 items.json 获取原始内容
        const originalItem = await findOriginalItem(sourceId, itemId, originalTitle);
        if (!originalItem) {
            return NextResponse.json({
                error: `Original article not found in items.json for source: ${sourceId}`
            }, { status: 404 });
        }

        // 2. 获取 Prompt 配置
        const promptConfig = await getPromptConfig(language);
        if (!promptConfig || !promptConfig.prompt) {
            return NextResponse.json({
                error: `No prompt config found for language: ${language}`
            }, { status: 400 });
        }

        // 3. 准备内容
        const plainTextContent = normalizeContent(originalItem.content);
        const finalPrompt = promptConfig.prompt
            .replace('{title}', originalItem.title)
            .replace('{content}', plainTextContent.slice(0, 6000))
            .replace('{source}', sourceId);

        // 4. 获取 API Key
        const apiKey = await getApiKey();
        if (!apiKey) {
            return NextResponse.json({
                error: 'OpenAI API Key not configured'
            }, { status: 400 });
        }

        // 5. 调用 OpenAI 生成新摘要
        const openai = new OpenAI({ apiKey });
        const startTime = Date.now();

        const response = await openai.chat.completions.create({
            model: promptConfig.model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: finalPrompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' }
        });

        const durationMs = Date.now() - startTime;
        const resultContent = response.choices[0].message.content;

        let parsedResult;
        try {
            parsedResult = JSON.parse(resultContent);
        } catch (e) {
            return NextResponse.json({
                error: 'Failed to parse AI response',
                raw: resultContent
            }, { status: 500 });
        }

        // 6. 更新已出版内容
        const updated = await updatePublishedItem(sourceId, date, language, itemId, parsedResult);
        if (!updated) {
            return NextResponse.json({
                error: 'Failed to update published item'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            result: parsedResult,
            usage: {
                promptTokens: response.usage?.prompt_tokens,
                completionTokens: response.usage?.completion_tokens,
                totalTokens: response.usage?.total_tokens
            },
            model: response.model,
            durationMs
        });

    } catch (error) {
        console.error('Regenerate error:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}
