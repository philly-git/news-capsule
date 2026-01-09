import { NextResponse } from 'next/server';
import { readJSON, listFiles } from '@/lib/storage';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    try {
        // 获取所有可用日期
        const availableDates = [];
        const rawDirs = await listFiles('raw');
        const dateDirs = rawDirs.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
        availableDates.push(...dateDirs.sort().reverse());

        // 如果没有指定日期，返回可用日期列表
        if (!date) {
            return NextResponse.json({ availableDates });
        }

        // 读取指定日期的原始数据
        let rssData = await readJSON(`raw/${date}/rss.json`);
        let articles = [];

        // 读取 articles 目录
        const articleFiles = await listFiles(`raw/${date}/articles`);
        const jsonFiles = articleFiles.filter(f => f.endsWith('.json'));

        for (const file of jsonFiles) {
            const articleData = await readJSON(`raw/${date}/articles/${file}`);
            if (articleData) {
                articles.push({
                    index: articleData.index,
                    title: articleData.title,
                    url: articleData.url,
                    contentLength: articleData.contentLength,
                    fetchedAt: articleData.fetchedAt
                });
            }
        }
        articles.sort((a, b) => a.index - b.index);

        // 读取最终生成的新闻数据
        let generatedNews = { zh: null, en: null };
        const zhNews = await readJSON(`news/${date}-zh.json`);
        const enNews = await readJSON(`news/${date}-en.json`);
        if (zhNews) generatedNews.zh = zhNews;
        if (enNews) generatedNews.en = enNews;

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
