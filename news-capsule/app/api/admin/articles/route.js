import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const RAW_DATA_DIR = path.join(process.cwd(), 'data', 'raw');

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
        return NextResponse.json({ error: '请提供日期参数' }, { status: 400 });
    }

    try {
        const articlesDir = path.join(RAW_DATA_DIR, date, 'articles');
        const rssPath = path.join(RAW_DATA_DIR, date, 'rss.json');

        const articles = [];

        // 首先尝试从 articles 目录读取（爬虫获取的完整正文）
        if (fs.existsSync(articlesDir)) {
            const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.json'));
            for (const file of files) {
                try {
                    const data = JSON.parse(fs.readFileSync(path.join(articlesDir, file), 'utf-8'));
                    articles.push({
                        index: data.index,
                        title: data.title,
                        url: data.url,
                        source: data.source || 'Unknown',
                        contentLength: data.contentLength || data.content?.length || 0,
                        contentPreview: data.content?.substring(0, 500) || '',
                        fetchedAt: data.fetchedAt
                    });
                } catch (e) {
                    // 跳过无法解析的文件
                }
            }
        }

        // 如果没有爬虫数据，从 RSS 数据中读取
        if (articles.length === 0 && fs.existsSync(rssPath)) {
            const rssData = JSON.parse(fs.readFileSync(rssPath, 'utf-8'));
            (rssData.items || []).forEach((item, idx) => {
                articles.push({
                    index: idx,
                    title: item.originalTitle || item.title,
                    url: item.link || item.source?.url,
                    source: item.source?.name || 'Unknown',
                    contentLength: item.content?.length || 0,
                    contentPreview: item.content?.replace(/<[^>]*>/g, '').substring(0, 500) || '',
                    fetchedAt: rssData.fetchedAt
                });
            });
        }

        // 按 index 排序
        articles.sort((a, b) => a.index - b.index);

        return NextResponse.json({
            date,
            articles,
            totalArticles: articles.length
        });

    } catch (error) {
        console.error('Articles API error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
