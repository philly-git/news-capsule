import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const RAW_DATA_DIR = path.join(process.cwd(), 'data', 'raw');
const NEWS_DATA_DIR = path.join(process.cwd(), 'data', 'news');

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    try {
        // 获取所有可用日期
        const availableDates = [];
        if (fs.existsSync(RAW_DATA_DIR)) {
            const dirs = fs.readdirSync(RAW_DATA_DIR).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
            availableDates.push(...dirs.sort().reverse());
        }

        // 如果没有指定日期，返回可用日期列表
        if (!date) {
            return NextResponse.json({ availableDates });
        }

        // 读取指定日期的原始数据
        const rawDir = path.join(RAW_DATA_DIR, date);
        const rssPath = path.join(rawDir, 'rss.json');
        const articlesDir = path.join(rawDir, 'articles');

        let rssData = null;
        let articles = [];

        if (fs.existsSync(rssPath)) {
            rssData = JSON.parse(fs.readFileSync(rssPath, 'utf-8'));
        }

        if (fs.existsSync(articlesDir)) {
            const articleFiles = fs.readdirSync(articlesDir).filter(f => f.endsWith('.json'));
            for (const file of articleFiles) {
                const articleData = JSON.parse(fs.readFileSync(path.join(articlesDir, file), 'utf-8'));
                articles.push({
                    index: articleData.index,
                    title: articleData.title,
                    url: articleData.url,
                    contentLength: articleData.contentLength,
                    fetchedAt: articleData.fetchedAt
                });
            }
            articles.sort((a, b) => a.index - b.index);
        }

        // 读取最终生成的新闻数据
        const zhNewsPath = path.join(NEWS_DATA_DIR, `${date}-zh.json`);
        const enNewsPath = path.join(NEWS_DATA_DIR, `${date}-en.json`);

        let generatedNews = { zh: null, en: null };
        if (fs.existsSync(zhNewsPath)) {
            generatedNews.zh = JSON.parse(fs.readFileSync(zhNewsPath, 'utf-8'));
        }
        if (fs.existsSync(enNewsPath)) {
            generatedNews.en = JSON.parse(fs.readFileSync(enNewsPath, 'utf-8'));
        }

        // 按来源分组统计
        const sourceStats = {};
        if (rssData?.items) {
            for (const item of rssData.items) {
                const sourceName = item.source?.name || 'Unknown';
                const contentLength = item.content?.length || 0;
                if (!sourceStats[sourceName]) {
                    sourceStats[sourceName] = {
                        count: 0,
                        language: item.source?.language || 'unknown',
                        totalContentLength: 0,
                        items: []
                    };
                }
                sourceStats[sourceName].count++;
                sourceStats[sourceName].totalContentLength += contentLength;
                sourceStats[sourceName].items.push({
                    title: item.originalTitle,
                    link: item.link,
                    pubDate: item.pubDate,
                    contentLength: contentLength
                });
            }
        }

        return NextResponse.json({
            date,
            availableDates,
            fetchedAt: rssData?.fetchedAt,
            totalRssItems: rssData?.items?.length || 0,
            totalArticles: articles.length,
            sourceStats,
            articles,
            generatedNews: {
                zh: generatedNews.zh?.news?.length || 0,
                en: generatedNews.en?.news?.length || 0
            }
        });
    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
