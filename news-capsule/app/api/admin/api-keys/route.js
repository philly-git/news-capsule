import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json');

/**
 * 读取设置
 */
function readSettings() {
    if (!fs.existsSync(SETTINGS_PATH)) {
        return { openai: { apiKey: '' } };
    }
    try {
        return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    } catch (e) {
        return { openai: { apiKey: '' } };
    }
}

/**
 * 保存设置
 */
function saveSettings(settings) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

/**
 * 掩码显示 API Key
 */
function maskApiKey(key) {
    if (!key || key.length < 8) return '';
    return key.slice(0, 7) + '...' + key.slice(-4);
}

/**
 * 从 OpenAI 获取可用模型列表
 */
async function fetchModelsFromOpenAI(apiKey) {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to fetch models');
        }

        const data = await response.json();

        // 过滤出适合文本处理的模型
        const textModels = data.data
            .filter(model => {
                const id = model.id.toLowerCase();
                // 筛选 GPT 系列和 o1 系列模型
                return (id.includes('gpt-4') || id.includes('gpt-3.5') || id.startsWith('o1'))
                    && !id.includes('vision')
                    && !id.includes('audio')
                    && !id.includes('realtime')
                    && !id.includes('instruct');
            })
            .map(model => model.id)
            .sort((a, b) => {
                // 优先显示常用模型
                const priority = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'o1-mini', 'o1-preview'];
                const aIndex = priority.indexOf(a);
                const bIndex = priority.indexOf(b);
                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;
                return a.localeCompare(b);
            });

        return textModels;
    } catch (error) {
        throw error;
    }
}

/**
 * GET - 获取 API Key 状态和可用模型
 */
export async function GET() {
    const settings = readSettings();
    const apiKey = settings.openai?.apiKey || process.env.OPENAI_API_KEY || '';

    const result = {
        openai: {
            configured: !!apiKey,
            keyPreview: maskApiKey(apiKey),
            keySource: settings.openai?.apiKey ? 'settings' : (process.env.OPENAI_API_KEY ? 'env' : 'none'),
            models: []
        }
    };

    // 如果有 API Key，尝试获取模型列表
    if (apiKey) {
        try {
            result.openai.models = await fetchModelsFromOpenAI(apiKey);
        } catch (error) {
            result.openai.error = error.message;
        }
    }

    return NextResponse.json(result);
}

/**
 * POST - 测试并保存 API Key
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { apiKey, testOnly } = body;

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
        }

        // 测试 API Key
        let models = [];
        try {
            models = await fetchModelsFromOpenAI(apiKey);
        } catch (error) {
            return NextResponse.json({
                success: false,
                error: error.message
            }, { status: 400 });
        }

        // 如果只是测试，不保存
        if (testOnly) {
            return NextResponse.json({
                success: true,
                models,
                keyPreview: maskApiKey(apiKey)
            });
        }

        // 保存到 settings.json
        const settings = readSettings();
        settings.openai = {
            apiKey,
            updatedAt: new Date().toISOString()
        };
        saveSettings(settings);

        return NextResponse.json({
            success: true,
            models,
            keyPreview: maskApiKey(apiKey),
            saved: true
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE - 删除保存的 API Key
 */
export async function DELETE() {
    try {
        const settings = readSettings();
        delete settings.openai?.apiKey;
        saveSettings(settings);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
