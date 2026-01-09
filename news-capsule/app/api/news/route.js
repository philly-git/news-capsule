import { NextResponse } from 'next/server';
import { readJSON, listFiles } from '@/lib/storage';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // 可选：指定日期
    const lang = searchParams.get('lang') || 'zh'; // 语言参数，默认中文

    try {
        let data = null;

        if (date) {
            // 获取指定日期+语言的新闻
            data = await readJSON(`news/${date}-${lang}.json`);

            // 如果指定语言文件不存在，尝试获取另一种语言
            if (!data) {
                const fallbackLang = lang === 'zh' ? 'en' : 'zh';
                data = await readJSON(`news/${date}-${fallbackLang}.json`);
            }

            // 如果都不存在，尝试旧格式（不带语言后缀）
            if (!data) {
                data = await readJSON(`news/${date}.json`);
            }
        } else {
            // 获取最新的新闻文件（按语言筛选）
            const files = await listFiles('news');
            const jsonFiles = files
                .filter(f => f.endsWith('.json'))
                .sort((a, b) => b.localeCompare(a));

            if (jsonFiles.length === 0) {
                return NextResponse.json({ error: 'No news available' }, { status: 404 });
            }

            // 优先查找匹配语言的文件
            const langFile = jsonFiles.find(f => f.includes(`-${lang}.json`));
            if (langFile) {
                data = await readJSON(`news/${langFile}`);
            } else {
                // 回退到最新文件
                data = await readJSON(`news/${jsonFiles[0]}`);
            }
        }

        if (!data) {
            return NextResponse.json({ error: 'News not found' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching news:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
