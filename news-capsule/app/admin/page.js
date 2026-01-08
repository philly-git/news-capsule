'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './admin.module.css';

export default function AdminPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchingAll, setFetchingAll] = useState(false);
    const [fetchingSource, setFetchingSource] = useState(null);
    const [expandedSource, setExpandedSource] = useState(null);
    const [sourceItems, setSourceItems] = useState({});
    const [loadingItems, setLoadingItems] = useState({});
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name }
    const [editSource, setEditSource] = useState(null); // { id, name, url, originalUrl, urlTested, urlValid }
    const [testingUrl, setTestingUrl] = useState(false);
    const [urlTestResult, setUrlTestResult] = useState(null); // { success, message, feedInfo }

    // 时间窗口状态
    const [timeWindow, setTimeWindow] = useState(48); // 默认 48 小时

    // 质量过滤相关状态
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const [filterConfig, setFilterConfig] = useState(null);
    const [filterRunning, setFilterRunning] = useState(false);
    const [filterResult, setFilterResult] = useState(null);

    // 分页状态 - 每个源的当前页
    const [sourcePage, setSourcePage] = useState({});
    const ITEMS_PER_PAGE = 10;

    // 筛选器状态
    const [statusFilter, setStatusFilter] = useState([]); // 多选: ['new', 'pending', 'queued', 'published', 'archived']，空数组表示全部
    const [timeFilter, setTimeFilter] = useState('all'); // 'all', '24h', '48h', '7d'

    // 信息源排序状态
    const [sourceSort, setSourceSort] = useState('activity'); // 'activity' | 'added'

    useEffect(() => {
        fetchSources();
        fetchFilterConfig();
    }, []);

    // 加载过滤规则配置
    async function fetchFilterConfig() {
        try {
            const res = await fetch('/api/admin/quality-filter');
            const json = await res.json();
            if (json.success) {
                setFilterConfig(json.config);
            }
        } catch (error) {
            console.error('Failed to fetch filter config:', error);
        }
    }

    async function fetchSources() {
        try {
            const res = await fetch('/api/admin/sources');
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error('Failed to fetch sources:', error);
        } finally {
            setLoading(false);
        }
    }

    // 获取源的条目详情
    async function fetchSourceItems(sourceId) {
        if (sourceItems[sourceId]) return; // 已加载

        setLoadingItems(prev => ({ ...prev, [sourceId]: true }));
        try {
            const res = await fetch(`/api/admin/sources/${sourceId}`);
            const json = await res.json();
            if (json.success) {
                setSourceItems(prev => ({ ...prev, [sourceId]: json.items }));
            }
        } catch (error) {
            console.error('Failed to fetch items:', error);
        } finally {
            setLoadingItems(prev => ({ ...prev, [sourceId]: false }));
        }
    }

    // 抓取单个源
    async function handleFetchSingle(sourceName, sourceId) {
        setFetchingSource(sourceName);

        try {
            const res = await fetch('/api/admin/fetch-rss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceNames: [sourceName], timeWindowHours: timeWindow })
            });
            await res.json();

            // 刷新数据
            await fetchSources();
            // 清除缓存的条目，强制重新加载
            setSourceItems(prev => {
                const newState = { ...prev };
                delete newState[sourceId];
                return newState;
            });
            // 如果已展开，重新加载条目
            if (expandedSource === sourceId) {
                fetchSourceItems(sourceId);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setFetchingSource(null);
        }
    }

    // 抓取全部源
    async function handleFetchAll() {
        setFetchingAll(true);
        const allSourceNames = data?.sources?.filter(s => s.enabled).map(s => s.name) || [];

        try {
            await fetch('/api/admin/fetch-rss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceNames: allSourceNames, timeWindowHours: timeWindow })
            });

            // 刷新数据并清除缓存
            await fetchSources();
            setSourceItems({});
        } catch (error) {
            console.error('Fetch all error:', error);
        } finally {
            setFetchingAll(false);
        }
    }

    // 执行质量检测
    async function handleQualityCheck() {
        setFilterRunning(true);
        setFilterResult(null);

        try {
            const res = await fetch('/api/admin/quality-filter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dryRun: false })
            });
            const json = await res.json();

            if (json.success) {
                setFilterResult(json);
                // 刷新数据和条目缓存
                await fetchSources();
                setSourceItems({});
            }
        } catch (error) {
            console.error('Quality check error:', error);
        } finally {
            setFilterRunning(false);
        }
    }

    // 更新过滤规则
    async function handleUpdateFilterRules(newRules) {
        try {
            const res = await fetch('/api/admin/quality-filter', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rules: newRules })
            });
            const json = await res.json();
            if (json.success) {
                setFilterConfig(json.config);
            }
        } catch (error) {
            console.error('Update filter rules error:', error);
        }
    }

    // 切换展开源
    function toggleSource(sourceId) {
        if (expandedSource === sourceId) {
            setExpandedSource(null);
        } else {
            setExpandedSource(sourceId);
            fetchSourceItems(sourceId);
        }
    }

    // 更新单个条目状态
    async function handleUpdateItemStatus(sourceId, itemId, newStatus) {
        try {
            const res = await fetch(`/api/admin/sources/${sourceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, status: newStatus })
            });
            const json = await res.json();
            if (json.success) {
                // 更新本地缓存
                setSourceItems(prev => {
                    const items = prev[sourceId]?.map(item =>
                        item.id === itemId ? { ...item, status: newStatus } : item
                    );
                    return { ...prev, [sourceId]: items };
                });
                // 刷新统计
                await fetchSources();
            }
        } catch (error) {
            console.error('Update item status error:', error);
        }
    }

    // 切换启用/禁用
    async function handleToggle(sourceId) {
        try {
            await fetch(`/api/admin/sources/${sourceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toggle: true })
            });
            await fetchSources();
        } catch (error) {
            console.error('Toggle failed:', error);
        }
    }

    // 删除源 - 显示确认模态框
    function handleDelete(sourceId, sourceName) {
        setDeleteConfirm({ id: sourceId, name: sourceName, deleteData: false });
    }

    // 确认删除
    async function confirmDelete() {
        if (!deleteConfirm) return;

        try {
            await fetch(`/api/admin/sources/${deleteConfirm.id}?deleteData=${deleteConfirm.deleteData}`, {
                method: 'DELETE'
            });
            setDeleteConfirm(null);
            await fetchSources();
        } catch (error) {
            alert('删除失败：' + error.message);
        }
    }

    // 编辑源 - 打开编辑模态框
    function handleEdit(source) {
        setEditSource({
            id: source.id,
            name: source.name,
            url: source.url,
            originalUrl: source.url,  // 保存原始 URL 用于检测是否修改
            urlTested: true,  // 原始 URL 默认已验证
            urlValid: true
        });
        setUrlTestResult(null);
    }

    // 测试新的 RSS 链接
    async function handleTestEditUrl() {
        if (!editSource?.url?.trim()) {
            setUrlTestResult({ success: false, message: '请输入 RSS 链接' });
            return;
        }

        setTestingUrl(true);
        setUrlTestResult(null);

        try {
            const res = await fetch('/api/admin/test-rss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: editSource.url.trim() })
            });

            const data = await res.json();

            if (!res.ok) {
                setUrlTestResult({ success: false, message: data.error || '测试失败' });
                setEditSource(prev => ({ ...prev, urlTested: true, urlValid: false }));
            } else {
                setUrlTestResult({
                    success: true,
                    message: `✅ 链接有效！订阅源“${data.feedInfo.title}”共 ${data.stats.totalItems} 篇文章`,
                    feedInfo: data.feedInfo
                });
                setEditSource(prev => ({ ...prev, urlTested: true, urlValid: true }));
            }
        } catch (err) {
            setUrlTestResult({ success: false, message: '请求失败：' + err.message });
            setEditSource(prev => ({ ...prev, urlTested: true, urlValid: false }));
        } finally {
            setTestingUrl(false);
        }
    }

    // URL 变化时重置验证状态
    function handleEditUrlChange(newUrl) {
        const urlChanged = newUrl !== editSource.originalUrl;
        setEditSource(prev => ({
            ...prev,
            url: newUrl,
            urlTested: !urlChanged,  // URL 变了就需要重新测试
            urlValid: !urlChanged    // URL 变了就先标记为无效
        }));
        if (urlChanged) {
            setUrlTestResult(null);
        }
    }

    // 确认编辑
    async function confirmEdit() {
        if (!editSource) return;

        // 检查 URL 是否已验证
        const urlChanged = editSource.url !== editSource.originalUrl;
        if (urlChanged && !editSource.urlValid) {
            alert('请先测试 RSS 链接的可用性');
            return;
        }

        try {
            const res = await fetch(`/api/admin/sources/${editSource.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editSource.name,
                    url: editSource.url
                })
            });
            const json = await res.json();
            if (json.success) {
                setEditSource(null);
                setUrlTestResult(null);
                await fetchSources();
            } else {
                alert('更新失败：' + (json.error || '未知错误'));
            }
        } catch (error) {
            alert('更新失败：' + error.message);
        }
    }

    // 格式化时间
    function formatTime(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) return `${diffMins} 分钟前`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} 小时前`;
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    // 格式化出版日期（始终显示绝对日期）
    function formatPublishDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    }

    // 统计（五种状态）
    const totalSources = data?.sources?.length || 0;
    const enabledSources = data?.sources?.filter(s => s.enabled).length || 0;
    const totalNewItems = data?.totalNewItems || 0;
    const totalPendingItems = data?.totalPendingItems || 0;
    const totalQueuedItems = data?.totalQueuedItems || 0;
    const totalPublishedItems = data?.totalPublishedItems || 0;
    const totalArchivedItems = data?.totalArchivedItems || 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>📰 编辑部</h1>
            </header>

            {loading && <div className={styles.loading}>加载中...</div>}

            {data && !loading && (
                <>
                    {/* 概览统计 - 仅显示信息源统计 */}
                    <section className={styles.section}>
                        <h2>📊 概览统计</h2>
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>{totalSources}</div>
                                <div className={styles.statLabel}>信息源</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>{enabledSources}</div>
                                <div className={styles.statLabel}>已启用</div>
                            </div>
                        </div>
                    </section>

                    {/* 全局筛选器 */}
                    <section className={styles.filterSection}>
                        <div className={styles.filterBar}>
                            <div className={styles.filterGroup}>
                                <label>发布时间：</label>
                                <select
                                    value={timeFilter}
                                    onChange={(e) => setTimeFilter(e.target.value)}
                                    className={styles.filterSelect}
                                >
                                    <option value="all">全部</option>
                                    <option value="24h">过去 24 小时</option>
                                    <option value="48h">过去 48 小时</option>
                                    <option value="7d">过去 7 天</option>
                                </select>
                            </div>
                            <div className={styles.filterGroup}>
                                <label>状态：</label>
                                <div className={styles.statusCheckboxGroup}>
                                    {[
                                        { value: 'new', label: '🆕 新增' },
                                        { value: 'pending', label: '⏳ 待审' },
                                        { value: 'queued', label: '📋 待出版' },
                                        { value: 'published', label: '✅ 已出版' },
                                        { value: 'archived', label: '📦 存档' }
                                    ].map(status => (
                                        <label key={status.value} className={styles.statusCheckbox}>
                                            <input
                                                type="checkbox"
                                                checked={statusFilter.includes(status.value)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setStatusFilter(prev => [...prev, status.value]);
                                                    } else {
                                                        setStatusFilter(prev => prev.filter(s => s !== status.value));
                                                    }
                                                }}
                                            />
                                            <span>{status.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 质量过滤配置面板 */}
                    <div className={styles.qualityFilterPanel}>
                        <div
                            className={styles.qualityFilterHeader}
                            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
                        >
                            <span className={styles.qualityFilterTitle}>
                                📦 自动存档规则
                            </span>
                            <span>{filterPanelOpen ? '▼' : '▶'}</span>
                        </div>
                        {filterPanelOpen && filterConfig && (
                            <div className={styles.qualityFilterBody}>
                                {/* 最小字数规则 */}
                                <div className={styles.filterRuleGroup}>
                                    <label className={styles.filterRuleLabel}>
                                        1. 最小字数阈值
                                    </label>
                                    <p className={styles.filterRuleDesc}>
                                        低于此字数的内容将被自动存档
                                    </p>
                                    <div className={styles.inputRow}>
                                        <input
                                            type="number"
                                            min="0"
                                            max="1000"
                                            value={filterConfig.rules.minWordCount}
                                            onChange={(e) => handleUpdateFilterRules({
                                                ...filterConfig.rules,
                                                minWordCount: parseInt(e.target.value) || 0
                                            })}
                                            className={styles.numberInput}
                                        />
                                        <span className={styles.inputUnit}>字</span>
                                    </div>
                                </div>

                                {/* 聚合内容关键词 */}
                                <div className={styles.filterRuleGroup}>
                                    <label className={styles.filterRuleLabel}>
                                        2. 信息合集关键词（标题匹配）
                                    </label>
                                    <p className={styles.filterRuleDesc}>
                                        标题包含以下关键词的内容将被自动存档
                                    </p>
                                    <div className={styles.patternList}>
                                        {filterConfig.rules.aggregationPatterns?.map((p, i) => (
                                            <span key={i} className={styles.patternTag}>{p}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* 视频检测 */}
                                <div className={styles.filterRuleGroup}>
                                    <label className={styles.filterRuleLabel}>
                                        3. 视频为主检测
                                    </label>
                                    <p className={styles.filterRuleDesc}>
                                        包含视频且文字少于 {filterConfig.rules.videoMinWordCount} 字的内容将被自动存档
                                    </p>
                                </div>

                                {/* 操作按钮 */}
                                <div className={styles.filterActions}>
                                    <button
                                        onClick={handleQualityCheck}
                                        disabled={filterRunning}
                                        className={styles.qualityBtn}
                                    >
                                        {filterRunning ? '筛选中...' : '📦 执行存档筛选'}
                                    </button>
                                </div>

                                {/* 检测结果摘要 */}
                                {filterResult && (
                                    <div className={styles.filterStats}>
                                        <span className={styles.filterStat}>
                                            总条目: <span className={styles.filterStatValue}>{filterResult.summary.totalItems}</span>
                                        </span>
                                        <span className={styles.filterStat}>
                                            已存档: <span className={styles.filterStatValue}>{filterResult.summary.totalFlagged}</span>
                                        </span>
                                        <span className={styles.filterStat}>
                                            保留率: <span className={styles.filterStatValue}>
                                                {((1 - filterResult.summary.totalFlagged / filterResult.summary.totalItems) * 100).toFixed(1)}%
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 信息源列表 */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2>📋 信息源列表</h2>
                            <div className={styles.headerActions}>
                                {/* 复合同步按钮 */}
                                <div className={styles.syncButtonGroup}>
                                    <button
                                        onClick={handleFetchAll}
                                        disabled={fetchingAll}
                                        className={styles.syncMainBtn}
                                    >
                                        {fetchingAll ? '同步中...' : '🔄 同步'}
                                    </button>
                                    <select
                                        value={timeWindow}
                                        onChange={(e) => setTimeWindow(Number(e.target.value))}
                                        className={styles.syncTimeSelect}
                                        disabled={fetchingAll}
                                    >
                                        <option value={24}>过去 24 小时</option>
                                        <option value={48}>过去 48 小时</option>
                                        <option value={168}>过去 1 周</option>
                                    </select>
                                </div>
                                <Link href="/admin/sources/add" className={styles.addBtn}>
                                    + 添加新源
                                </Link>
                            </div>
                        </div>
                        {/* 排序选择器 */}
                        <div className={styles.sortBar}>
                            <span className={styles.sortLabel}>排序：</span>
                            <select
                                value={sourceSort}
                                onChange={(e) => setSourceSort(e.target.value)}
                                className={styles.sortSelect}
                            >
                                <option value="activity">🔥 按活跃度</option>
                                <option value="added">➕ 按添加时间</option>
                            </select>
                        </div>

                        {/* 按语言分组渲染 */}
                        {(() => {
                            // 分组
                            const zhSources = data.sources.filter(s => s.language === 'zh');
                            const enSources = data.sources.filter(s => s.language === 'en');

                            // 排序函数
                            const sortSources = (sources) => {
                                if (sourceSort === 'activity') {
                                    return [...sources].sort((a, b) => {
                                        const aActivity = (a.stats?.newCount || 0) + (a.stats?.pendingCount || 0);
                                        const bActivity = (b.stats?.newCount || 0) + (b.stats?.pendingCount || 0);
                                        return bActivity - aActivity;
                                    });
                                }
                                // 默认按添加时间（保持原顺序）
                                return sources;
                            };

                            // 渲染单个信息源卡片
                            const renderSourceCard = (source) => (
                                <div key={source.id} className={`${styles.sourceCard} ${!source.enabled ? styles.disabled : ''}`}>
                                    <div
                                        className={styles.sourceHeader}
                                        onClick={() => toggleSource(source.id)}
                                    >
                                        {/* 第一行：名称 + 操作按钮 */}
                                        <div className={styles.sourceHeaderRow}>
                                            <span className={styles.sourceName}>
                                                {source.name}
                                            </span>
                                            <div className={styles.sourceActions}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleToggle(source.id); }}
                                                    className={`${styles.toggleBtn} ${source.enabled ? styles.enabled : styles.disabled}`}
                                                    title={source.enabled ? '点击禁用' : '点击启用'}
                                                >
                                                    {source.enabled ? '✓' : '○'}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleFetchSingle(source.name, source.id); }}
                                                    disabled={fetchingSource === source.name || fetchingAll || !source.enabled}
                                                    className={styles.fetchBtn}
                                                >
                                                    {fetchingSource === source.name ? '...' : '🔄'}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(source.id, source.name); }}
                                                    className={styles.deleteBtn}
                                                    title="删除"
                                                >
                                                    🗑
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(source); }}
                                                    className={styles.editBtn}
                                                    title="编辑"
                                                >
                                                    ✏️
                                                </button>
                                                <span className={styles.expandIcon}>
                                                    {expandedSource === source.id ? '▼' : '▶'}
                                                </span>
                                            </div>
                                        </div>
                                        {/* 第二行：状态统计 + 同步时间 */}
                                        <div className={styles.sourceMetaRow}>
                                            <div className={styles.sourceStats}>
                                                {source.stats?.totalItems > 0 ? (
                                                    <>
                                                        {source.stats.newCount > 0 && (
                                                            <span className={`${styles.statBadge} ${styles.statNew}`}>🆕 {source.stats.newCount}</span>
                                                        )}
                                                        {source.stats.pendingCount > 0 && (
                                                            <span className={`${styles.statBadge} ${styles.statPending}`}>⏳ {source.stats.pendingCount}</span>
                                                        )}
                                                        {source.stats.queuedCount > 0 && (
                                                            <span className={`${styles.statBadge} ${styles.statQueued}`}>📋 {source.stats.queuedCount}</span>
                                                        )}
                                                        {source.stats.publishedCount > 0 && (
                                                            <span className={`${styles.statBadge} ${styles.statPublished}`}>✅ {source.stats.publishedCount}</span>
                                                        )}
                                                        {source.stats.archivedCount > 0 && (
                                                            <span className={`${styles.statBadge} ${styles.statArchived}`}>📦 {source.stats.archivedCount}</span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className={styles.noStats}>暂无数据</span>
                                                )}
                                            </div>
                                            <span className={styles.syncTime}>
                                                🕐 {source.stats?.lastSync ? formatTime(source.stats.lastSync) + '同步' : '未同步'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 展开的条目列表 */}
                                    {expandedSource === source.id && (() => {
                                        // 筛选逻辑
                                        const now = new Date();
                                        const filteredItems = (sourceItems[source.id] || []).filter(item => {
                                            // 状态筛选（多选）
                                            if (statusFilter.length > 0 && !statusFilter.includes(item.status)) return false;
                                            // 时间筛选
                                            if (timeFilter !== 'all' && item.pubDate) {
                                                const pubTime = new Date(item.pubDate);
                                                const diffHours = (now - pubTime) / (1000 * 60 * 60);
                                                if (timeFilter === '24h' && diffHours > 24) return false;
                                                if (timeFilter === '48h' && diffHours > 48) return false;
                                                if (timeFilter === '7d' && diffHours > 168) return false;
                                            }
                                            return true;
                                        });

                                        // 分页逻辑
                                        const currentPage = sourcePage[source.id] || 0;
                                        const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
                                        const paginatedItems = filteredItems.slice(
                                            currentPage * ITEMS_PER_PAGE,
                                            (currentPage + 1) * ITEMS_PER_PAGE
                                        );

                                        return (
                                            <div className={styles.sourceItems}>
                                                {loadingItems[source.id] ? (
                                                    <div className={styles.loading}>加载条目中...</div>
                                                ) : paginatedItems.length > 0 ? (
                                                    <>
                                                        {paginatedItems.map((item) => (
                                                            <div
                                                                key={item.id}
                                                                className={`${styles.newsItem} ${item.status === 'archived' ? styles.archivedItem : ''}`}
                                                            >
                                                                <div className={styles.newsItemContent}>
                                                                    <a
                                                                        href={item.link}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={styles.newsTitle}
                                                                    >
                                                                        {item.title}
                                                                    </a>
                                                                    <div className={styles.newsItemMeta}>
                                                                        <span className={styles.contentLen}>
                                                                            {item.wordCount?.toLocaleString()} 字
                                                                        </span>
                                                                        <span className={styles.pubDate}>
                                                                            {formatTime(item.pubDate)}
                                                                        </span>
                                                                        <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                                                                            {item.status === 'new' ? '🆕 新增' :
                                                                                item.status === 'pending' ? '⏳ 待审' :
                                                                                    item.status === 'queued' ? '📋 待出版' :
                                                                                        item.status === 'published' ? `✅ 已出版${item.publishedAt ? ' (' + formatPublishDate(item.publishedAt) + ')' : ''}` :
                                                                                            item.status === 'archived' ? '📦 存档' : item.status}
                                                                        </span>
                                                                    </div>
                                                                    {item.status !== 'published' && (
                                                                        <div className={styles.itemActions}>
                                                                            {(item.status === 'queued' || item.status === 'archived') && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleUpdateItemStatus(source.id, item.id, 'pending');
                                                                                    }}
                                                                                    className={styles.pendingBtn}
                                                                                    title="返回待审"
                                                                                >
                                                                                    ⏳ 返回待审
                                                                                </button>
                                                                            )}
                                                                            {(item.status === 'new' || item.status === 'pending') && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleUpdateItemStatus(source.id, item.id, 'queued');
                                                                                    }}
                                                                                    className={styles.queueBtn}
                                                                                    title="标记为待出版"
                                                                                >
                                                                                    📋 待出版
                                                                                </button>
                                                                            )}
                                                                            {item.status !== 'archived' && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleUpdateItemStatus(source.id, item.id, 'archived');
                                                                                    }}
                                                                                    className={styles.archiveBtn}
                                                                                    title="标记为存档"
                                                                                >
                                                                                    📦 存档
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {/* 分页控件 */}
                                                        {totalPages > 1 && (
                                                            <div className={styles.pagination}>
                                                                <button
                                                                    onClick={() => setSourcePage(prev => ({ ...prev, [source.id]: Math.max(0, currentPage - 1) }))}
                                                                    disabled={currentPage === 0}
                                                                    className={styles.pageBtn}
                                                                >
                                                                    ← 上一页
                                                                </button>
                                                                <span className={styles.pageInfo}>
                                                                    {currentPage + 1} / {totalPages} ({filteredItems.length} 条)
                                                                </span>
                                                                <button
                                                                    onClick={() => setSourcePage(prev => ({ ...prev, [source.id]: Math.min(totalPages - 1, currentPage + 1) }))}
                                                                    disabled={currentPage >= totalPages - 1}
                                                                    className={styles.pageBtn}
                                                                >
                                                                    下一页 →
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className={styles.noData}>
                                                        {sourceItems[source.id]?.length > 0 ? '没有符合筛选条件的条目' : '暂无条目，请点击 🔄 同步'}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    <div className={styles.sourceUrl}>
                                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                                            {source.url}
                                        </a>
                                    </div>
                                </div>
                            );

                            return (
                                <>
                                    {/* 中文源 */}
                                    {zhSources.length > 0 && (
                                        <div className={styles.sourceGroup}>
                                            <h3 className={styles.sourceGroupTitle}>🇨🇳 中文源 ({zhSources.length})</h3>
                                            <div className={styles.sourceList}>
                                                {sortSources(zhSources).map(renderSourceCard)}
                                            </div>
                                        </div>
                                    )}

                                    {/* 英文源 */}
                                    {enSources.length > 0 && (
                                        <div className={styles.sourceGroup}>
                                            <h3 className={styles.sourceGroupTitle}>🌐 英文源 ({enSources.length})</h3>
                                            <div className={styles.sourceList}>
                                                {sortSources(enSources).map(renderSourceCard)}
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </section>

                    {/* 删除确认模态框 */}
                    {deleteConfirm && (
                        <div className={styles.modal}>
                            <div className={styles.modalContent}>
                                <h3>确认删除</h3>
                                <p>确定要删除「{deleteConfirm.name}」吗？</p>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={deleteConfirm.deleteData}
                                        onChange={(e) => setDeleteConfirm(prev => ({
                                            ...prev,
                                            deleteData: e.target.checked
                                        }))}
                                    />
                                    同时删除历史数据
                                </label>
                                <p className={styles.modalWarning}>此操作不可撤销</p>
                                <div className={styles.modalActions}>
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className={styles.cancelBtn}
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className={styles.dangerBtn}
                                    >
                                        确认删除
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 编辑模态框 */}
                    {editSource && (
                        <div className={styles.modal}>
                            <div className={styles.modalContent}>
                                <h3>编辑信息源</h3>
                                <div className={styles.editFormGroup}>
                                    <label className={styles.editLabel}>名称</label>
                                    <input
                                        type="text"
                                        value={editSource.name}
                                        onChange={(e) => setEditSource(prev => ({
                                            ...prev,
                                            name: e.target.value
                                        }))}
                                        className={styles.editInput}
                                        placeholder="信息源名称"
                                    />
                                </div>
                                <div className={styles.editFormGroup}>
                                    <label className={styles.editLabel}>RSS 链接</label>
                                    <div className={styles.editUrlRow}>
                                        <input
                                            type="text"
                                            value={editSource.url}
                                            onChange={(e) => handleEditUrlChange(e.target.value)}
                                            className={`${styles.editInput} ${styles.editUrlInput}`}
                                            placeholder="https://example.com/feed.xml"
                                        />
                                        <button
                                            onClick={handleTestEditUrl}
                                            disabled={testingUrl || editSource.url === editSource.originalUrl}
                                            className={styles.testUrlBtn}
                                        >
                                            {testingUrl ? '测试中...' : '测试'}
                                        </button>
                                    </div>
                                    {/* URL 测试结果 */}
                                    {urlTestResult && (
                                        <div className={`${styles.urlTestResult} ${urlTestResult.success ? styles.success : styles.error}`}>
                                            {urlTestResult.message}
                                        </div>
                                    )}
                                    {/* URL 已修改但未测试的提示 */}
                                    {editSource.url !== editSource.originalUrl && !editSource.urlTested && (
                                        <div className={styles.urlTestHint}>
                                            ⚠️ 链接已修改，请点击“测试”验证可用性
                                        </div>
                                    )}
                                </div>
                                <div className={styles.modalActions}>
                                    <button
                                        onClick={() => { setEditSource(null); setUrlTestResult(null); }}
                                        className={styles.cancelBtn}
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={confirmEdit}
                                        disabled={editSource.url !== editSource.originalUrl && !editSource.urlValid}
                                        className={styles.primaryBtn}
                                    >
                                        保存
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )
            }
        </div >
    );
}
