'use client';

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

/**
 * 已出版内容管理页面
 */
export default function PublishedPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [language, setLanguage] = useState('zh');
    const [selectedDate, setSelectedDate] = useState(null);
    const [regeneratingId, setRegeneratingId] = useState(null);
    const [message, setMessage] = useState(null);
    const [expandedItem, setExpandedItem] = useState(null);

    // 获取已出版内容
    const fetchPublished = async (lang, date) => {
        setLoading(true);
        try {
            let url = `/api/admin/published?lang=${lang}`;
            if (date) {
                url += `&date=${date}`;
            }
            const res = await fetch(url);
            const result = await res.json();
            setData(result);
            if (result.date && !selectedDate) {
                setSelectedDate(result.date);
            }
        } catch (err) {
            console.error('Error fetching published:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPublished(language, selectedDate);
    }, [language]);

    useEffect(() => {
        if (selectedDate) {
            fetchPublished(language, selectedDate);
        }
    }, [selectedDate]);

    // 重新生成单篇文章
    const handleRegenerate = async (item) => {
        if (regeneratingId) return;

        setRegeneratingId(item.id);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/regenerate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceId: item.sourceId,
                    itemId: item.id,
                    originalTitle: item.originalTitle,
                    date: selectedDate,
                    language
                })
            });

            const result = await res.json();

            if (result.success) {
                setMessage({
                    type: 'success',
                    text: `✅ 已重新生成: ${item.originalTitle?.slice(0, 40)}...`
                });
                // 刷新列表
                fetchPublished(language, selectedDate);
            } else {
                setMessage({
                    type: 'error',
                    text: result.error || '重新生成失败'
                });
            }
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.message
            });
        }

        setRegeneratingId(null);
    };

    // 渲染评分
    const renderScore = (score) => {
        const maxScore = 3;
        const normalized = Math.min(maxScore, Math.max(0, score || 0));
        const apples = [];
        for (let i = 0; i < maxScore; i++) {
            if (i < normalized) {
                apples.push(<span key={i} style={{ opacity: 1 }}>🍎</span>);
            } else {
                apples.push(<span key={i} style={{ opacity: 0.3 }}>🍎</span>);
            }
        }
        return apples;
    };

    // 格式化时间
    const formatTime = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const availableDates = data?.availableDates || [];
    const sources = data?.sources || [];
    const totalItems = data?.totalItems || 0;

    // 合并所有文章
    const allItems = sources.flatMap(source => source.items || []);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>📚 已出版内容</h1>
            </header>

            {/* 概览统计 */}
            <section className={styles.section}>
                <h2>📊 概览统计</h2>
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>{totalItems}</div>
                        <div className={styles.statLabel}>已出版文章</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>{sources.length}</div>
                        <div className={styles.statLabel}>信息源</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>{availableDates.length}</div>
                        <div className={styles.statLabel}>出版日期</div>
                    </div>
                </div>
            </section>

            {/* 筛选器 */}
            <section className={styles.filterSection}>
                <div className={styles.filterBar}>
                    <div className={styles.filterGroup}>
                        <label>语言：</label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="zh">中文</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                    <div className={styles.filterGroup}>
                        <label>出版日期：</label>
                        <select
                            value={selectedDate || ''}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className={styles.filterSelect}
                        >
                            {availableDates.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            {/* 消息提示 */}
            {message && (
                <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage}>
                    {message.text}
                </div>
            )}

            {loading && <div className={styles.loading}>加载中...</div>}

            {!loading && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>📋 文章列表</h2>
                    </div>

                    {allItems.length === 0 ? (
                        <div className={styles.emptyState}>暂无已出版内容</div>
                    ) : (
                        <div className={styles.sourcesList}>
                            {allItems.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`${styles.sourceCard} ${item.regeneratedAt ? styles.regenerated : ''}`}
                                >
                                    {/* 头部：可点击展开 */}
                                    <div
                                        className={styles.sourceHeader}
                                        onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                    >
                                        <div className={styles.sourceHeaderRow}>
                                            <span className={styles.sourceName}>
                                                #{index + 1} · {item.originalTitle}
                                            </span>
                                            <div className={styles.sourceActions}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRegenerate(item);
                                                    }}
                                                    disabled={regeneratingId === item.id}
                                                    className={styles.fetchBtn}
                                                    title="重新生成摘要"
                                                >
                                                    {regeneratingId === item.id ? '...' : '🔄'}
                                                </button>
                                                <span className={styles.expandIcon}>
                                                    {expandedItem === item.id ? '▼' : '▶'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.sourceMetaRow}>
                                            <div className={styles.sourceStats}>
                                                <span className={`${styles.statBadge} ${styles.statPublished}`}>
                                                    {item.sourceName}
                                                </span>
                                                <span className={styles.scoreBadge}>
                                                    {renderScore(item.readOriginal?.score)} 原文价值
                                                </span>
                                                {item.regeneratedAt && (
                                                    <span className={`${styles.statBadge} ${styles.statQueued}`}>
                                                        ↻ 已重新生成
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 展开的详情 */}
                                    {expandedItem === item.id && (
                                        <div className={styles.sourceItems}>
                                            {/* 编辑摘要 */}
                                            {item.editorNote && (
                                                <div className={styles.newsItem}>
                                                    <div className={styles.newsItemContent}>
                                                        <div className={styles.itemLabel}>📝 编辑摘要</div>
                                                        <p className={styles.editorNote}>{item.editorNote}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 关键要点 */}
                                            {item.keyPoints && item.keyPoints.length > 0 && (
                                                <div className={styles.newsItem}>
                                                    <div className={styles.newsItemContent}>
                                                        <div className={styles.itemLabel}>🎯 关键要点</div>
                                                        <ul className={styles.keyPointsList}>
                                                            {item.keyPoints.map((point, i) => (
                                                                <li key={i}>{point}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 原文评估 */}
                                            {item.readOriginal && (
                                                <div className={styles.newsItem}>
                                                    <div className={styles.newsItemContent}>
                                                        <div className={styles.itemLabel}>
                                                            🍎 原文价值 ({item.readOriginal.score}/3)
                                                        </div>
                                                        <p className={styles.reason}>{item.readOriginal.reason}</p>
                                                        {item.readOriginal.whoShouldRead && (
                                                            <p className={styles.whoShouldRead}>
                                                                👤 适合阅读：{item.readOriginal.whoShouldRead}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 元信息 */}
                                            <div className={styles.newsItem}>
                                                <div className={styles.newsItemMeta}>
                                                    <a
                                                        href={item.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={styles.newsTitle}
                                                    >
                                                        📎 查看原文
                                                    </a>
                                                    {item.regeneratedAt && (
                                                        <span className={styles.pubDate}>
                                                            重新生成于 {formatTime(item.regeneratedAt)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
