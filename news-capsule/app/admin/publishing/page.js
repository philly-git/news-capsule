'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../admin.module.css';

export default function PublishingPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    // const [publishing, setPublishing] = useState(false); // Deprecated in favor of detailed status
    const [publishProgress, setPublishProgress] = useState({ current: 0, total: 0, isPublishing: false });
    const [result, setResult] = useState(null);
    // 每个条目的目标语言: { itemId: 'zh' | 'en' | 'both' }
    const [itemLangs, setItemLangs] = useState({});
    // 每个条目的发布状态: { itemId: 'idle' | 'publishing' | 'success' | 'error' | 'partial_success' }
    const [itemStatus, setItemStatus] = useState({});

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
                const defaultStatus = {};
                json.items.forEach(item => {
                    defaultLangs[item.id] = 'both';
                    defaultStatus[item.id] = 'idle';
                });
                setItemLangs(defaultLangs);
                setItemStatus(defaultStatus);
            }
        } catch (error) {
            console.error('Fetch queued items error:', error);
        } finally {
            setLoading(false);
        }
    }

    // 设置单个条目的目标语言
    function setItemLang(itemId, lang) {
        if (publishProgress.isPublishing) return; // 发布中不可更改
        setItemLangs(prev => ({ ...prev, [itemId]: lang }));
    }

    // 批量设置所有条目的目标语言
    function setAllLangs(lang) {
        if (publishProgress.isPublishing) return; // 发布中不可更改
        const newLangs = {};
        items.forEach(item => {
            newLangs[item.id] = lang;
        });
        setItemLangs(newLangs);
    }

    async function handlePublish() {
        if (items.length === 0) return;

        setPublishProgress({ current: 0, total: items.length, isPublishing: true });
        setResult(null);

        // 重置所有状态为 idle (如果有上次失败的重试)
        setItemStatus(prev => {
            const next = { ...prev };
            items.forEach(item => next[item.id] = 'idle');
            return next;
        });

        let successCount = 0;
        let failCount = 0;
        let detailedResults = [];

        try {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const targetLang = itemLangs[item.id] || 'both';

                // 更新当前条目状态为发布中
                setItemStatus(prev => ({ ...prev, [item.id]: 'publishing' }));

                try {
                    const res = await fetch('/api/admin/publishing', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            items: [{
                                id: item.id,
                                sourceId: item.sourceId,
                                targetLang: targetLang
                            }],
                            publishDate: new Date().toISOString().split('T')[0]
                        })
                    });

                    const json = await res.json();

                    if (json.success) {
                        // 检查双语发布的部分成功情况
                        let status = 'success';

                        if (targetLang === 'both') {
                            const zhOk = json.zhResult; // 假设后端返回了具体对象非空即成功，或根据业务逻辑判断
                            const enOk = json.enResult;
                            // 注意：后端目前逻辑是如果 fetch 失败打印 error 但不中断整个流程，
                            // 需要确认 backend route 返回结构。根据 route.js 代码：
                            // 如果 API 调用成功(ok)，则 zhResult/enResult 有值。
                            // 如果失败，zhResult/enResult 为 null。

                            if (!zhOk && !enOk) {
                                // 理论上如果 success=true，至少有一个成功？或者 route.js 没有严格检查子生成结果就返回 true?
                                // 重新看 route.js: 只有只要没有抛出异常，都会返回 success: true.
                                // 我们需要根据 zhResult / enResult 判断。
                                status = 'error';
                            } else if (!zhOk || !enOk) {
                                status = 'partial_success';
                            }
                        }

                        if (status === 'error') {
                            failCount++;
                            setItemStatus(prev => ({ ...prev, [item.id]: 'error' }));
                        } else {
                            successCount++;
                            setItemStatus(prev => ({ ...prev, [item.id]: status }));
                        }
                    } else {
                        failCount++;
                        setItemStatus(prev => ({ ...prev, [item.id]: 'error' }));
                    }
                } catch (err) {
                    console.error(`Publish item ${item.id} error:`, err);
                    failCount++;
                    setItemStatus(prev => ({ ...prev, [item.id]: 'error' }));
                }

                // 更新总体进度
                setPublishProgress(prev => ({ ...prev, current: i + 1 }));
            }

            setResult({
                success: true, // 总体流程完成
                message: `发布完成！成功 ${successCount} 条，失败 ${failCount} 条。`
            });

            // 稍微延迟后，清理已成功的条目 (可选体验：保留让用户看一会儿？)
            // 这里我们选择让用户手动刷新或提供一个“清理已发布”按钮，或者保留状态。
            // 现在的逻辑：保留列表展示状态。

        } catch (error) {
            setResult({
                success: false,
                message: `发布流程异常中断: ${error.message}`
            });
        } finally {
            setPublishProgress(prev => ({ ...prev, isPublishing: false }));
        }
    }

    // 移除单个条目
    async function handleRemoveItem(itemId, sourceId) {
        if (publishProgress.isPublishing) return;
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

    // 计算进度百分比
    const progressPercent = publishProgress.total > 0
        ? Math.round((publishProgress.current / publishProgress.total) * 100)
        : 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>🏭 印刷厂</h1>
                <Link href="/admin" className={styles.backLink}>
                    {publishProgress.isPublishing ? '发布中勿离开...' : '← 返回编辑部'}
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
                                disabled={publishProgress.isPublishing || items.length === 0}
                                className={styles.publishBtn}
                                style={{ opacity: publishProgress.isPublishing ? 0.7 : 1 }}
                            >
                                {publishProgress.isPublishing ? `发布中 ${publishProgress.current}/${publishProgress.total}` : `🚀 确认发布 (${items.length})`}
                            </button>
                        </div>

                        {/* 进度条 */}
                        {publishProgress.total > 0 && (publishProgress.isPublishing || result) && (
                            <div style={{ margin: '1rem 0', background: '#eee', borderRadius: '4px', overflow: 'hidden', height: '10px' }}>
                                <div style={{
                                    width: `${progressPercent}%`,
                                    background: '#4CAF50',
                                    height: '100%',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        )}

                        {/* 批量设置语言 - 仅在非发布状态显示 */}
                        {!publishProgress.isPublishing && !result && items.length > 0 && (
                            <div className={styles.batchLangSetter}>
                                <span className={styles.batchLabel}>批量设置：</span>
                                <div className={styles.langBtnGroup}>
                                    <button onClick={() => setAllLangs('zh')} className={styles.langSetBtn}>全部 🇨🇳 中文</button>
                                    <button onClick={() => setAllLangs('en')} className={styles.langSetBtn}>全部 🇺🇸 英文</button>
                                    <button onClick={() => setAllLangs('both')} className={styles.langSetBtn}>全部 📢 两者</button>
                                </div>
                            </div>
                        )}

                        {/* 发布结果 */}
                        {result && (
                            <div className={`${styles.publishResult} ${result.success ? styles.success : styles.error}`}>
                                {result.message}
                                {result.success && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <button
                                            onClick={() => {
                                                // 清理已发布的条目
                                                setItems(prev => prev.filter(item => itemStatus[item.id] !== 'success' && itemStatus[item.id] !== 'partial_success'));
                                                setResult(null);
                                                setPublishProgress({ current: 0, total: 0, isPublishing: false });
                                            }}
                                            style={{ fontSize: '0.9rem', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                                        >
                                            清理已发布条目
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* 待出版列表 */}
                    <section className={styles.section}>
                        {items.length > 0 ? (
                            <div className={styles.queuedList}>
                                {items.map((item) => (
                                    <div key={item.id} className={styles.queuedItem} style={{
                                        opacity: (publishProgress.isPublishing && itemStatus[item.id] === 'idle') ? 0.5 : 1,
                                        borderLeft: itemStatus[item.id] === 'publishing' ? '4px solid #2196F3' :
                                            itemStatus[item.id] === 'success' ? '4px solid #4CAF50' :
                                                itemStatus[item.id] === 'error' ? '4px solid #f44336' :
                                                    itemStatus[item.id] === 'partial_success' ? '4px solid #FFC107' : '1px solid #ddd'
                                    }}>
                                        <div className={styles.queuedItemContent}>
                                            <a href={item.link} target="_blank" rel="noopener noreferrer" className={styles.queuedItemTitle}>
                                                {item.title}
                                            </a>
                                            <div className={styles.queuedItemMeta}>
                                                <span className={styles.sourceName}>{item.sourceName}</span>
                                                <span className={styles.wordCount}>{item.wordCount?.toLocaleString()} 字</span>
                                                <span className={styles.pubDate}>{formatTime(item.pubDate)}</span>
                                            </div>
                                        </div>

                                        {/* 状态或操作区域 */}
                                        <div className={styles.actionArea}>
                                            {/* 语言选择 (非发布状态显示) */}
                                            {!publishProgress.isPublishing && itemStatus[item.id] === 'idle' && (
                                                <div className={styles.langSelector}>
                                                    <button onClick={() => setItemLang(item.id, 'zh')} className={`${styles.langBtn} ${itemLangs[item.id] === 'zh' ? styles.langBtnActive : ''}`} title="只发布到中文版">🇨🇳</button>
                                                    <button onClick={() => setItemLang(item.id, 'en')} className={`${styles.langBtn} ${itemLangs[item.id] === 'en' ? styles.langBtnActive : ''}`} title="只发布到英文版">🇺🇸</button>
                                                    <button onClick={() => setItemLang(item.id, 'both')} className={`${styles.langBtn} ${itemLangs[item.id] === 'both' ? styles.langBtnActive : ''}`} title="发布到两个版本">📢</button>
                                                </div>
                                            )}

                                            {/* 状态显示 */}
                                            {itemStatus[item.id] === 'publishing' && <span title="发布中...">🔄</span>}
                                            {itemStatus[item.id] === 'success' && <span title="发布成功">✅</span>}
                                            {itemStatus[item.id] === 'partial_success' && <span title="部分成功(只有一种语言发布成功)">⚠️</span>}
                                            {itemStatus[item.id] === 'error' && <span title="发布失败">❌</span>}

                                            {/* 移除按钮 (仅在 Idle 状态) */}
                                            {itemStatus[item.id] === 'idle' && !publishProgress.isPublishing && (
                                                <button onClick={() => handleRemoveItem(item.id, item.sourceId)} className={styles.removeBtn} title="移出待出版">✕</button>
                                            )}
                                        </div>
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
