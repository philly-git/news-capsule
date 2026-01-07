import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'news');

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // 可选：指定日期
    const lang = searchParams.get('lang') || 'zh'; // 语言参数，默认中文

    try {
        let targetFile;

        if (date) {
            // 获取指定日期+语言的新闻
            targetFile = path.join(DATA_DIR, `${date}-${lang}.json`);

            // 如果指定语言文件不存在，尝试获取另一种语言
            if (!fs.existsSync(targetFile)) {
                const fallbackLang = lang === 'zh' ? 'en' : 'zh';
                targetFile = path.join(DATA_DIR, `${date}-${fallbackLang}.json`);
            }

            // 如果都不存在，尝试旧格式（不带语言后缀）
            if (!fs.existsSync(targetFile)) {
                targetFile = path.join(DATA_DIR, `${date}.json`);
            }
        } else {
            // 获取最新的新闻文件（按语言筛选）
            const files = fs.readdirSync(DATA_DIR)
                .filter(f => f.endsWith('.json'))
                .sort((a, b) => b.localeCompare(a));

            if (files.length === 0) {
                return NextResponse.json({ error: 'No news available' }, { status: 404 });
            }

            // 优先查找匹配语言的文件
            const langFile = files.find(f => f.includes(`-${lang}.json`));
            if (langFile) {
                targetFile = path.join(DATA_DIR, langFile);
            } else {
                // 回退到最新文件
                targetFile = path.join(DATA_DIR, files[0]);
            }
        }

        if (!fs.existsSync(targetFile)) {
            return NextResponse.json({ error: 'News not found' }, { status: 404 });
        }

        const content = fs.readFileSync(targetFile, 'utf-8');
        const data = JSON.parse(content);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching news:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
