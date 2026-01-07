'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../admin.module.css';

export default function PublishingPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        fetchQueuedItems();
    }, []);

    async function fetchQueuedItems() {
        try {
            const res = await fetch('/api/admin/publishing');
            const json = await res.json();
            if (json.success) {
                setItems(json.items);
            }
        } catch (error) {
            console.error('Fetch queued items error:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handlePublish() {
        if (items.length === 0) return;

        setPublishing(true);
        setResult(null);

        try {
            const res = await fetch('/api/admin/publishing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemIds: items.map(item => item.id),
                    publishDate: new Date().toISOString().split('T')[0]
                })
            });

            const json = await res.json();

            if (json.success) {
                setResult({
                    success: true,
                    message: `成功发布 ${json.publishedItems} 条新闻！`
                });
                // 清空列表
                setItems([]);
            } else {
                setResult({
                    success: false,
                    message: json.error || '发布失败'
                });
            }
        } catch (error) {
            setResult({
                success: false,
                message: error.message
            });
        } finally {
            setPublishing(false);
        }
    }

    // 移除单个条目（从待出版变回待审）
    async function handleRemoveItem(itemId, sourceId) {
        try {
            await fetch(`/api/admin/sources/${sourceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, status: 'pending' })
            });
            setItems(prev => prev.filter(item => item.id !== itemId));
        } catch (error) {
            console.error('Remove item error:', error);
        }
    }

    function formatTime(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>🏭 印刷厂</h1>
                <Link href="/admin" className={styles.backLink}>
                    ← 返回编辑部
                </Link>
            </header>

            {loading && <div className={styles.loading}>加载中...</div>}

            {!loading && (
                <>
                    {/* 发布操作区 */}
                    <section className={styles.section}>
                        <div className={styles.publishHeader}>
                            <div>
                                <h2>📋 待出版列表</h2>
                                <p className={styles.hint}>
                                    共 {items.length} 条新闻待出版，点击"确认发布"将进行 AI 总结并添加到今日新闻
                                </p>
                            </div>
                            <button
                                onClick={handlePublish}
                                disabled={publishing || items.length === 0}
                                className={styles.publishBtn}
                            >
                                {publishing ? '发布中...' : `🚀 确认发布 (${items.length})`}
                            </button>
                        </div>

                        {/* 发布结果 */}
                        {result && (
                            <div className={`${styles.publishResult} ${result.success ? styles.success : styles.error}`}>
                                {result.message}
                            </div>
                        )}
                    </section>

                    {/* 待出版列表 */}
                    <section className={styles.section}>
                        {items.length > 0 ? (
                            <div className={styles.queuedList}>
                                {items.map((item) => (
                                    <div key={item.id} className={styles.queuedItem}>
                                        <div className={styles.queuedItemContent}>
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.queuedItemTitle}
                                            >
                                                {item.title}
                                            </a>
                                            <div className={styles.queuedItemMeta}>
                                                <span className={styles.sourceName}>{item.sourceName}</span>
                                                <span className={styles.wordCount}>{item.wordCount?.toLocaleString()} 字</span>
                                                <span className={styles.pubDate}>{formatTime(item.pubDate)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.id, item.sourceId)}
                                            className={styles.removeBtn}
                                            title="移出待出版"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <p>暂无待出版的新闻</p>
                                <Link href="/admin" className={styles.goToEditorial}>
                                    前往编辑部挑选新闻 →
                                </Link>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
