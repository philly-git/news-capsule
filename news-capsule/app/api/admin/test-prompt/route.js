import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { convert } from 'html-to-text';

const DATA_DIR = path.join(process.cwd(), 'data', 'feeds');
const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json');

/**
 * 获取 API Key
 */
function getApiKey() {
    // 优先使用 settings.json 中的 key
    if (fs.existsSync(SETTINGS_PATH)) {
        try {
            const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
            if (settings.openai?.apiKey) {
                return settings.openai.apiKey;
            }
        } catch (e) {
            // ignore
        }
    }
    return process.env.OPENAI_API_KEY;
}

/**
 * 读取指定源的文章列表
 */
function getSourceItems(sourceId) {
    const itemsPath = path.join(DATA_DIR, sourceId, 'items.json');
    if (!fs.existsSync(itemsPath)) {
        return [];
    }
    try {
        const data = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));
        return data.items || [];
    } catch (e) {
        return [];
    }
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
 * POST - 测试 Prompt 生成摘要
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { sourceId, itemIndex, model, prompt, language } = body;

        if (!sourceId || itemIndex === undefined || !prompt) {
            return NextResponse.json({
                error: 'Missing required fields: sourceId, itemIndex, prompt'
            }, { status: 400 });
        }

        // 获取文章
        const items = getSourceItems(sourceId);
        if (itemIndex < 0 || itemIndex >= items.length) {
            return NextResponse.json({
                error: `Invalid itemIndex: ${itemIndex}. Available: 0-${items.length - 1}`
            }, { status: 400 });
        }

        const item = items[itemIndex];
        const plainTextContent = normalizeContent(item.content);

        // 构建 Prompt
        const finalPrompt = prompt
            .replace('{title}', item.title)
            .replace('{content}', plainTextContent.slice(0, 6000))
            .replace('{source}', sourceId);

        // 获取 API Key
        const apiKey = getApiKey();
        if (!apiKey) {
            return NextResponse.json({
                error: 'OpenAI API Key not configured'
            }, { status: 400 });
        }

        // 调用 OpenAI
        const openai = new OpenAI({ apiKey });
        const startTime = Date.now();

        const response = await openai.chat.completions.create({
            model: model || 'gpt-4o-mini',
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
            parsedResult = { raw: resultContent, parseError: e.message };
        }

        return NextResponse.json({
            success: true,
            input: {
                title: item.title,
                contentLength: plainTextContent.length,
                contentPreview: plainTextContent.slice(0, 200) + '...',
                wordCount: item.wordCount || plainTextContent.split(/\s+/).length,
                link: item.link
            },
            result: parsedResult,
            usage: {
                promptTokens: response.usage?.prompt_tokens,
                completionTokens: response.usage?.completion_tokens,
                totalTokens: response.usage?.total_tokens
            },
            model: response.model,
            durationMs,
            debug: {
                promptLength: finalPrompt.length,
                itemIndex,
                sourceId
            }
        });

    } catch (error) {
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}
