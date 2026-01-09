import { NextResponse } from 'next/server';
import { readSettings, writeSettings } from '@/lib/storage';

/**
 * GET - 获取当前 Prompt 配置
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang');

    const settings = await readSettings();
    const promptConfig = settings.promptConfig || {};

    if (lang) {
        // 返回指定语言的配置
        return NextResponse.json({
            language: lang,
            config: promptConfig[lang] || null
        });
    }

    // 返回所有配置
    return NextResponse.json({
        promptConfig
    });
}

/**
 * POST - 保存 Prompt 配置
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { language, model, prompt } = body;

        if (!language || !model || !prompt) {
            return NextResponse.json({
                error: 'Missing required fields: language, model, prompt'
            }, { status: 400 });
        }

        if (!['zh', 'en'].includes(language)) {
            return NextResponse.json({
                error: 'Invalid language. Must be "zh" or "en"'
            }, { status: 400 });
        }

        const settings = await readSettings();

        if (!settings.promptConfig) {
            settings.promptConfig = {};
        }

        settings.promptConfig[language] = {
            model,
            prompt,
            updatedAt: new Date().toISOString()
        };

        await writeSettings(settings);

        return NextResponse.json({
            success: true,
            language,
            model,
            updatedAt: settings.promptConfig[language].updatedAt
        });
    } catch (error) {
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}

/**
 * DELETE - 删除指定语言的 Prompt 配置（恢复默认）
 */
export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang');

    if (!lang) {
        return NextResponse.json({
            error: 'Missing lang parameter'
        }, { status: 400 });
    }

    const settings = await readSettings();

    if (settings.promptConfig && settings.promptConfig[lang]) {
        delete settings.promptConfig[lang];
        await writeSettings(settings);
    }

    return NextResponse.json({ success: true });
}
