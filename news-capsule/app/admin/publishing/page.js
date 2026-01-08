'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../admin.module.css';

export default function PublishingPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [result, setResult] = useState(null);
    // 每个条目的目标语言: { itemId: 'zh' | 'en' | 'both' }
    const [itemLangs, setItemLangs] = useState({});

    useEffect(() => {
        fetchQueuedItems();
    }, []);

    async function fetchQueuedItems() {
        try {
            const res = await fetch('/api/admin/publishing');
            const json = await res.json();
            if (json.success) {
                setItems(json.items);
                // 初始化所有条目的默认语言为 'both'
                const defaultLangs = {};
                json.items.forEach(item => {
                    defaultLangs[item.id] = 'both';
                });
                setItemLangs(defaultLangs);
            }
        } catch (error) {
            console.error('Fetch queued items error:', error);
        } finally {
            setLoading(false);
        }
    }

    // 设置单个条目的目标语言
    function setItemLang(itemId, lang) {
        setItemLangs(prev => ({ ...prev, [itemId]: lang }));
    }

    // 批量设置所有条目的目标语言
    function setAllLangs(lang) {
        const newLangs = {};
        items.forEach(item => {
            newLangs[item.id] = lang;
        });
        setItemLangs(newLangs);
    }

    async function handlePublish() {
        if (items.length === 0) return;

        setPublishing(true);
        setResult(null);

        try {
            // 构建带语言选择的条目列表
            const itemsWithLang = items.map(item => ({
                id: item.id,
                sourceId: item.sourceId,
                targetLang: itemLangs[item.id] || 'both'
            }));

            const res = await fetch('/api/admin/publishing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: itemsWithLang,
                    publishDate: new Date().toISOString().split('T')[0]
                })
            });

            const json = await res.json();

            if (json.success) {
                setResult({
                    success: true,
                    message: `成功发布！中文版 ${json.zhCount || 0} 条，英文版 ${json.enCount || 0} 条`
                });
                // 清空列表
                setItems([]);
                setItemLangs({});
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
            setItemLangs(prev => {
                const newLangs = { ...prev };
                delete newLangs[itemId];
                return newLangs;
            });
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

    // 统计各语言数量
    const langCounts = {
        zh: Object.values(itemLangs).filter(l => l === 'zh' || l === 'both').length,
        en: Object.values(itemLangs).filter(l => l === 'en' || l === 'both').length
    };

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
                                    共 {items.length} 条新闻待出版
                                    {items.length > 0 && (
                                        <span className={styles.langPreview}>
                                            （中文版 {langCounts.zh} 条，英文版 {langCounts.en} 条）
                                        </span>
                                    )}
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

                        {/* 批量设置语言 */}
                        {items.length > 0 && (
                            <div className={styles.batchLangSetter}>
                                <span className={styles.batchLabel}>批量设置：</span>
                                <div className={styles.langBtnGroup}>
                                    <button
                                        onClick={() => setAllLangs('zh')}
                                        className={styles.langSetBtn}
                                    >
                                        全部 🇨🇳 中文
                                    </button>
                                    <button
                                        onClick={() => setAllLangs('en')}
                                        className={styles.langSetBtn}
                                    >
                                        全部 🇺🇸 英文
                                    </button>
                                    <button
                                        onClick={() => setAllLangs('both')}
                                        className={styles.langSetBtn}
                                    >
                                        全部 📢 两者
                                    </button>
                                </div>
                            </div>
                        )}

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
                                        {/* 语言选择按钮组 */}
                                        <div className={styles.langSelector}>
                                            <button
                                                onClick={() => setItemLang(item.id, 'zh')}
                                                className={`${styles.langBtn} ${itemLangs[item.id] === 'zh' ? styles.langBtnActive : ''}`}
                                                title="只发布到中文版"
                                            >
                                                🇨🇳
                                            </button>
                                            <button
                                                onClick={() => setItemLang(item.id, 'en')}
                                                className={`${styles.langBtn} ${itemLangs[item.id] === 'en' ? styles.langBtnActive : ''}`}
                                                title="只发布到英文版"
                                            >
                                                🇺🇸
                                            </button>
                                            <button
                                                onClick={() => setItemLang(item.id, 'both')}
                                                className={`${styles.langBtn} ${itemLangs[item.id] === 'both' ? styles.langBtnActive : ''}`}
                                                title="发布到两个版本"
                                            >
                                                📢
                                            </button>
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
