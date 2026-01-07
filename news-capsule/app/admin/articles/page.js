'use client';

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

export default function ArticlesPage() {
    const [availableDates, setAvailableDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedArticle, setExpandedArticle] = useState(null);

    useEffect(() => {
        fetchDates();
    }, []);

    useEffect(() => {
        if (selectedDate) {
            fetchArticles(selectedDate);
        }
    }, [selectedDate]);

    async function fetchDates() {
        try {
            const res = await fetch('/api/admin/raw-data');
            const json = await res.json();
            setAvailableDates(json.availableDates || []);
            if (json.availableDates?.length > 0) {
                setSelectedDate(json.availableDates[0]);
            }
        } catch (error) {
            console.error('Failed to fetch dates:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchArticles(date) {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/articles?date=${date}`);
            const json = await res.json();
            setArticles(json.articles || []);
        } catch (error) {
            console.error('Failed to fetch articles:', error);
        } finally {
            setLoading(false);
        }
    }

    function toggleArticle(index) {
        setExpandedArticle(expandedArticle === index ? null : index);
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>📄 文章内容</h1>
            </header>

            {/* 日期选择 */}
            <section className={styles.section}>
                <div className={styles.controls}>
                    <label htmlFor="date-select">选择日期：</label>
                    <select
                        id="date-select"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className={styles.dateSelect}
                    >
                        {availableDates.map(date => (
                            <option key={date} value={date}>{date}</option>
                        ))}
                    </select>
                    <span className={styles.articleCount}>
                        共 {articles.length} 篇文章
                    </span>
                </div>
            </section>

            {loading && <div className={styles.loading}>加载中...</div>}

            {!loading && articles.length === 0 && (
                <div className={styles.noData}>
                    暂无文章数据，请先在「信息源管理」中抓取 RSS
                </div>
            )}

            {!loading && articles.length > 0 && (
                <section className={styles.section}>
                    <h2>📋 文章列表</h2>
                    <div className={styles.articleList}>
                        {articles.map((article, idx) => (
                            <div key={idx} className={styles.articleCard}>
                                <div
                                    className={styles.articleHeader}
                                    onClick={() => toggleArticle(idx)}
                                >
                                    <div className={styles.articleInfo}>
                                        <span className={styles.articleIndex}>{idx + 1}</span>
                                        <div className={styles.articleMeta}>
                                            <span className={styles.articleTitle}>
                                                {article.title}
                                            </span>
                                            <span className={styles.articleSource}>
                                                {article.source} · {article.contentLength?.toLocaleString()} 字符
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.articleActions}>
                                        <a
                                            href={article.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.linkBtn}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            原文
                                        </a>
                                        <span className={styles.expandIcon}>
                                            {expandedArticle === idx ? '▼' : '▶'}
                                        </span>
                                    </div>
                                </div>
                                {expandedArticle === idx && (
                                    <div className={styles.articleContent}>
                                        <pre className={styles.contentPreview}>
                                            {article.contentPreview || '暂无内容预览'}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
