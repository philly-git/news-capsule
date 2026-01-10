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
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { sourceId, itemId, title }

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

    // 核心 API 调用逻辑 - 不涉及 UI 状态
    const regenerateItemApi = async (item) => {
        // 预检查关键字段
        if (!item.sourceId || !selectedDate || !language) {
            console.error('Missing required fields for regeneration:', {
                sourceId: item.sourceId,
                date: selectedDate,
                lang: language,
                item
            });
            return { success: false, error: 'Missing required fields (check console)' };
        }

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
            return result;
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    // 重新生成单篇文章
    const handleRegenerate = async (item) => {
        // 如果正在批量生成，或者正在生成别的文章，则阻止
        if (isRegeneratingAll || (regeneratingId && regeneratingId !== item.id)) return;

        setRegeneratingId(item.id);
        setMessage(null);

        const result = await regenerateItemApi(item);

        if (result.success) {
            setMessage({
                type: 'success',
                text: `✅ 已重新生成: ${item.originalTitle?.slice(0, 40)}...`
            });
            await fetchPublished(language, selectedDate);
        } else {
            setMessage({
                type: 'error',
                text: result.error || '重新生成失败'
            });
        }

        setRegeneratingId(null);
    };

    // 批量重新生成所有当前显示的文章
    const [isRegeneratingAll, setIsRegeneratingAll] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [confirmBatch, setConfirmBatch] = useState(false);

    // 自动重置确认状态
    useEffect(() => {
        let timer;
        if (confirmBatch) {
            timer = setTimeout(() => setConfirmBatch(false), 3000);
        }
        return () => clearTimeout(timer);
    }, [confirmBatch]);

    const handleRegenerateAll = async (e) => {
        if (e) e.preventDefault();

        if (!allItems.length || isRegeneratingAll) return;

        // 第一步：进入确认状态
        if (!confirmBatch) {
            setConfirmBatch(true);
            return;
        }

        // 第二步：执行
        setConfirmBatch(false);
        console.log('Starting batch regeneration...', { count: allItems.length, date: selectedDate });

        setIsRegeneratingAll(true);
        setProgress({ current: 0, total: allItems.length });
        setMessage(null);

        let successCount = 0;

        try {
            for (let i = 0; i < allItems.length; i++) {
                const item = allItems[i];

                // 更新进度状态
                setProgress({ current: i + 1, total: allItems.length });
                if (i % 5 === 0) console.log(`Processing ${i + 1}/${allItems.length}:`, item.originalTitle);

                // 调用 API
                const result = await regenerateItemApi(item);

                if (result.success) {
                    successCount++;
                } else {
                    console.error(`Failed to regenerate ${item.id}:`, result.error);
                }

                // 稍微停顿，避免请求过于密集
                await new Promise(r => setTimeout(r, 500));
            }

            setMessage({
                type: 'success',
                text: `🎉 批量处理完成！成功生成 ${successCount}/${allItems.length} 篇。`
            });
        } catch (error) {
            console.error('Batch regeneration error:', error);
            setMessage({
                type: 'error',
                text: `批量处理中断: ${error.message}`
            });
        } finally {
            console.log('Batch regeneration finished');
            setIsRegeneratingAll(false);
            setRegeneratingId(null);
            // 最终刷新列表
            await fetchPublished(language, selectedDate);
        }
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

    // 删除已发布文章
    const handleDeleteItem = async () => {
        if (!deleteConfirm) return;

        try {
            const res = await fetch(
                `/api/admin/published/${deleteConfirm.sourceId}?date=${selectedDate}&lang=${language}&itemId=${deleteConfirm.itemId}`,
                { method: 'DELETE' }
            );
            const result = await res.json();

            if (result.success) {
                setMessage({ type: 'success', text: `✅ 已删除: ${deleteConfirm.title?.slice(0, 30)}...` });
                setDeleteConfirm(null);
                await fetchPublished(language, selectedDate);
            } else {
                setMessage({ type: 'error', text: result.error || '删除失败' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: '删除失败: ' + err.message });
        }
    };

    const availableDates = data?.availableDates || [];
    const sources = data?.sources || [];
    const totalItems = data?.totalItems || 0;

    // 合并所有文章
    const allItems = sources.flatMap(source =>
        (source.items || []).map(item => ({
            ...item,
            sourceId: source.sourceId, // API 返回的是 sourceId，不是 id
            sourceName: source.sourceName // API 返回的是 sourceName，不是 name
        }))
    );

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
                        <div className={styles.headerActions}>
                            <button
                                type="button"
                                onClick={handleRegenerateAll}
                                disabled={loading || isRegeneratingAll || allItems.length === 0}
                                className={styles.actionBtn}
                                style={confirmBatch ? { borderColor: '#e03e3e', color: '#e03e3e', background: '#fff5f5' } : {}}
                                title="重新生成当前列表所有文章的摘要"
                            >
                                {isRegeneratingAll
                                    ? `⏳ 处理中 (${progress.current}/${progress.total})`
                                    : confirmBatch
                                        ? '⚠️ 确认全部重生成？'
                                        : '🔄 重新生成全部'}
                            </button>
                        </div>
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
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirm({
                                                            sourceId: item.sourceId,
                                                            itemId: item.id,
                                                            title: item.originalTitle
                                                        });
                                                    }}
                                                    className={styles.deleteBtn}
                                                    title="删除文章"
                                                >
                                                    🗑
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

            {/* 删除确认模态框 */}
            {deleteConfirm && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h3>确认删除</h3>
                        <p>确定要删除「{deleteConfirm.title?.slice(0, 50)}...」吗？</p>
                        <p className={styles.modalWarning}>此操作不可撤销</p>
                        <div className={styles.modalActions}>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className={styles.cancelBtn}
                            >
                                取消
                            </button>
                            <button
                                onClick={handleDeleteItem}
                                className={styles.dangerBtn}
                            >
                                确认删除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
