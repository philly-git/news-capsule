'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../admin.module.css';

export default function AddSourcePage() {
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    // 添加表单状态
    const [sourceName, setSourceName] = useState('');
    const [language, setLanguage] = useState('zh');
    const [category, setCategory] = useState('tech');

    async function handleTest() {
        if (!url.trim()) {
            setError('请输入 RSS 链接');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);
        setSaveSuccess(false);

        try {
            const res = await fetch('/api/admin/test-rss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim() })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || '测试失败');
                return;
            }

            setResult(data);
            // 自动填充表单
            setSourceName(data.feedInfo.title || '');
            setLanguage(data.feedInfo.detectedLanguage || 'zh');
        } catch (err) {
            setError('请求失败：' + err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!sourceName.trim()) {
            setError('请输入源名称');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const res = await fetch('/api/admin/sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: sourceName.trim(),
                    url: url.trim(),
                    language,
                    category
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || '保存失败');
                return;
            }

            setSaveSuccess(true);
            // 2秒后跳转到信息源管理页面
            setTimeout(() => {
                router.push('/admin');
            }, 2000);
        } catch (err) {
            setError('保存失败：' + err.message);
        } finally {
            setSaving(false);
        }
    }

    function formatDate(dateStr) {
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
                <h1>➕ 添加信息源</h1>
            </header>

            {/* 输入区域 */}
            <section className={styles.section}>
                <h2>测试 RSS 源</h2>
                <div className={styles.inputGroup}>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="输入 RSS 链接，如 https://example.com/feed.xml"
                        className={styles.textInput}
                        onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                    />
                    <button
                        onClick={handleTest}
                        disabled={loading}
                        className={styles.primaryBtn}
                    >
                        {loading ? '测试中...' : '测试'}
                    </button>
                </div>
                {error && <p className={styles.errorText}>{error}</p>}
            </section>

            {/* 测试结果 */}
            {result && (
                <>
                    {/* 添加到配置 */}
                    <section className={styles.section}>
                        <h2>✅ 添加到配置</h2>
                        {saveSuccess ? (
                            <div className={styles.successCard}>
                                <p>🎉 信息源添加成功！正在跳转到管理页面...</p>
                            </div>
                        ) : (
                            <div className={styles.infoCard}>
                                <div className={styles.formRow}>
                                    <label className={styles.formLabel}>源名称</label>
                                    <input
                                        type="text"
                                        value={sourceName}
                                        onChange={(e) => setSourceName(e.target.value)}
                                        className={styles.formInput}
                                        placeholder="例如：极客公园"
                                    />
                                </div>
                                <div className={styles.formRow}>
                                    <label className={styles.formLabel}>语言</label>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className={styles.formSelect}
                                    >
                                        <option value="zh">中文</option>
                                        <option value="en">英文</option>
                                    </select>
                                </div>
                                <div className={styles.formRow}>
                                    <label className={styles.formLabel}>分类</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className={styles.formSelect}
                                    >
                                        <option value="tech">科技</option>
                                        <option value="news">新闻</option>
                                        <option value="finance">财经</option>
                                        <option value="other">其他</option>
                                    </select>
                                </div>
                                <div className={styles.formActions}>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className={styles.saveBtn}
                                    >
                                        {saving ? '保存中...' : '💾 添加到配置'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* 源信息 */}
                    <section className={styles.section}>
                        <h2>📡 源信息</h2>
                        <div className={styles.infoCard}>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>名称</span>
                                <span className={styles.infoValue}>{result.feedInfo.title}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>语言</span>
                                <span className={`${styles.langBadge} ${styles[result.feedInfo.detectedLanguage]}`}>
                                    {result.feedInfo.detectedLanguage === 'zh' ? '中文' : '英文'}
                                </span>
                            </div>
                            {result.feedInfo.description && (
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>描述</span>
                                    <span className={styles.infoValue}>{result.feedInfo.description}</span>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 数据结构分析 */}
                    {result.structureAnalysis && (
                        <section className={styles.section}>
                            <h2>🔍 数据结构分析</h2>
                            <div className={styles.infoCard}>
                                <div className={styles.recommendation}>
                                    {result.structureAnalysis.recommendation}
                                </div>
                                <div className={styles.structureGrid}>
                                    <div className={styles.structureItem}>
                                        <span className={styles.structureLabel}>content:encoded</span>
                                        <span className={styles.structureValue}>
                                            {result.structureAnalysis.sampleStructure['content:encoded'] || 0} 字符
                                        </span>
                                    </div>
                                    <div className={styles.structureItem}>
                                        <span className={styles.structureLabel}>content</span>
                                        <span className={styles.structureValue}>
                                            {result.structureAnalysis.sampleStructure['content'] || 0} 字符
                                        </span>
                                    </div>
                                    <div className={styles.structureItem}>
                                        <span className={styles.structureLabel}>description</span>
                                        <span className={styles.structureValue}>
                                            {result.structureAnalysis.sampleStructure['description'] || 0} 字符
                                        </span>
                                    </div>
                                    <div className={styles.structureItem}>
                                        <span className={styles.structureLabel}>summary</span>
                                        <span className={styles.structureValue}>
                                            {result.structureAnalysis.sampleStructure['summary'] || 0} 字符
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.availableFields}>
                                    <span className={styles.fieldsLabel}>可用字段：</span>
                                    <span className={styles.fieldsValue}>
                                        {result.structureAnalysis.availableFields?.join(', ') || '-'}
                                    </span>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 统计数据 */}
                    <section className={styles.section}>
                        <h2>📊 过去 7 天统计</h2>
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>{result.stats.totalItems}</div>
                                <div className={styles.statLabel}>文章数量</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>{result.stats.avgWordCount.toLocaleString()}</div>
                                <div className={styles.statLabel}>平均字数</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>{result.stats.totalWordCount.toLocaleString()}</div>
                                <div className={styles.statLabel}>总字数</div>
                            </div>
                        </div>
                    </section>

                    {/* 文章列表 */}
                    <section className={styles.section}>
                        <h2>📄 文章列表</h2>
                        {result.items.length > 0 ? (
                            <table className={styles.articlesTable}>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>标题</th>
                                        <th>字数</th>
                                        <th>发布时间</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.items.map((item) => (
                                        <tr key={item.index}>
                                            <td>{item.index + 1}</td>
                                            <td>
                                                <a
                                                    href={item.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {item.title}
                                                </a>
                                            </td>
                                            <td>{item.wordCount.toLocaleString()}</td>
                                            <td>{formatDate(item.pubDate)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className={styles.noData}>暂无文章数据</p>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
