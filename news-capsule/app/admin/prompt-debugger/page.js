'use client';

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

// 默认的 Prompt 模板 - 与 settings.json 保持一致（0-3分制）
const DEFAULT_PROMPT_ZH = `## 角色设定

你是一个专业的新闻编辑。你的读者是一群想要快速掌握新闻关键信息的知识工作者。请你对下面的新闻进行深入阅读后进行总结，并评估在读完"摘要（editorNote + keyPoints）"后是否仍值得阅读原文。

**重要：**全程使用中文输出。

* 输入新闻可能为英文/中文/混合语言。请先理解原文，再严格按本模板用中文输出。
* 人名、公司/机构名、产品名、法规/文件名、缩写、数字、日期、币种与单位请尽量保留原文写法；如需翻译，首次出现请采用"中文解释（原文/缩写）"格式。

---

## 输出要求（必须严格遵守）

### 1) editorNote（编辑概要）

站在专业编辑角度，用一句话写出**最重要的结论 + 关键实体**：

* 30–50 个中文字
* 尽量包含：主体（公司/组织/机构/人物/项目，如有）+ 关键动作/变化 + 至少 1 个具体要素（数字/时间/产品/范围）
* 可以加入非常简短的编辑观点（但避免空泛形容词）
* 不要和 keyPoints 逐字重复

### 2) keyPoints（关键要点）

提取 3–4 个核心要点，每个要点：

* 一句话，15–30 个中文字
* 必须包含可核查的具体信息：数字/名称/时间/范围/对比（至少其一）
* 按重要性排序，最重要的放第一条
* 避免重复 editorNote 已出现的同一事实（可以补充不同维度）

### 3) readOriginal（阅读原文评估）

评估「读完 editorNote + keyPoints 后，原文还剩多少**独有价值/不可替代内容**」。

#### 3.1 score（增量信息分）

* 取值：0–3（**不是推荐指数**，仅表示原文相对摘要的"增量信息/材料"强度）

**评分标准：**

* **3：不可替代的一手/独家材料**（可能改变理解，可引用/复核）
* **2：高密度参考资料**（适合对比、复用或直接落地）
* **1：关键语境补充**（核心事实已覆盖，但原文仍有重要背景）
* **0：几乎无增量**（摘要已覆盖几乎所有可行动信息）

#### 3.2 reason（增量说明）

* 30–50 个中文字
* 必须点名**至少 2 个**"摘要无法复现的具体物件/材料"
* 禁止使用："更多细节/更多信息/技术信息/更全面"等模糊表述

#### 3.3 whoShouldRead（目标读者）

* 20–30 个中文字
* 说明什么背景/岗位/决策场景的读者，在看过摘要后仍建议阅读原文

---

## JSON 输出格式样本

{
  "editorNote": "AWS 推出 Graviton4 实例，称同等性能可降约 20% 成本，瞄准通用计算与 AI 推理负载",
  "keyPoints": [
    "C8g 系列较 Graviton3 性能提升约 30%",
    "首批上线美东与法兰克福区域，支持按秒计费",
    "规格覆盖 12–96 vCPU，内存最高 192GB",
    "官方迁移指南提供 3 步兼容性检查清单"
  ],
  "readOriginal": {
    "score": 2,
    "reason": "原文给出按区域/规格的完整价目表，并附基准测试图表与原始数值，便于直接对比测算",
    "whoShouldRead": "需要做云算力选型、成本测算或迁移评估的架构师与 FinOps"
  }
}

---

新闻标题: {title}
新闻内容: {content}
来源: {source}`;

const DEFAULT_PROMPT_EN = `## Role

You are a professional news editor. Your readers are knowledge workers who want to grasp key news quickly. Summarize the news below and assess how much unique value remains in the original article after reading your summary.

**IMPORTANT:** Output everything in **English**.

* The input news may be in English, Chinese, or mixed languages. First understand the original, then follow this template.
* Keep proper nouns and exact facts as-is whenever possible.

---

## Output Requirements (must follow strictly)

### 1) editorNote

A single-sentence editorial note that states the **core takeaway** with key entities.

* 20–35 words
* Should include: a main subject + the key action/change + at least one concrete element

### 2) keyPoints

Extract 3–4 key points. Each point:

* One sentence, 12–22 words
* Must include at least one verifiable detail
* Ordered by importance

### 3) readOriginal (incremental value after the summary)

#### 3.1 score (Incremental Info Score)

* Range: 0–3 (**NOT** a recommendation score)

**Scoring rubric:**
* **3: Irreplaceable primary/exclusive material**
* **2: Dense reference material**
* **1: Key nuance and boundaries**
* **0: Little to no incremental value**

#### 3.2 reason

* 20–35 words
* MUST name **at least two** concrete artifacts/materials the original contains

#### 3.3 whoShouldRead

* 12–20 words
* Specify which reader background/role should still read the original

---

## JSON Output Example

{
  "editorNote": "AWS launched new Graviton4 instances, claiming about 20% lower cost at similar performance for general compute and AI inference.",
  "keyPoints": [
    "The C8g line targets a roughly 30% performance gain over Graviton3.",
    "Initial availability includes us-east-1 and eu-central-1, with per-second billing.",
    "Instance sizes span 12–96 vCPUs and up to 192GB memory.",
    "An official migration guide includes a three-step compatibility checklist."
  ],
  "readOriginal": {
    "score": 2,
    "reason": "The original includes a region-by-region price table and benchmark charts with underlying numbers.",
    "whoShouldRead": "Cloud architects and FinOps teams doing instance selection or cost modeling."
  }
}

---

**IMPORTANT: You MUST output everything in English.**

News title: {title}
News content: {content}
Source: {source}`;

export default function PromptDebuggerPage() {
    // 数据状态
    const [sources, setSources] = useState([]);
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentConfig, setCurrentConfig] = useState({ zh: null, en: null });

    // 选择状态
    const [selectedSourceId, setSelectedSourceId] = useState('');
    const [sourceItems, setSourceItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
    const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
    const [language, setLanguage] = useState('zh');
    const [prompt, setPrompt] = useState(DEFAULT_PROMPT_ZH);

    // 生成状态
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // 保存配置状态
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // 初始化加载
    useEffect(() => {
        async function init() {
            setLoading(true);
            try {
                // 获取信息源列表
                const sourcesRes = await fetch('/api/admin/sources');
                const sourcesData = await sourcesRes.json();
                setSources(sourcesData.sources || []);

                // 获取可用模型
                const apiKeysRes = await fetch('/api/admin/api-keys');
                const apiKeysData = await apiKeysRes.json();
                if (apiKeysData.openai?.models?.length > 0) {
                    setModels(apiKeysData.openai.models);
                } else {
                    setModels(['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo']);
                }

                // 获取当前配置
                const configRes = await fetch('/api/admin/prompt-config');
                const configData = await configRes.json();
                setCurrentConfig(configData.promptConfig || {});
            } catch (err) {
                console.error('Init error:', err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    // 语言切换时更新 Prompt（优先使用已保存的配置）
    useEffect(() => {
        const savedConfig = currentConfig[language];
        if (savedConfig?.prompt) {
            setPrompt(savedConfig.prompt);
            setSelectedModel(savedConfig.model || 'gpt-4o-mini');
        } else {
            setPrompt(language === 'zh' ? DEFAULT_PROMPT_ZH : DEFAULT_PROMPT_EN);
        }
    }, [language, currentConfig]);

    // 保存配置到产品
    async function handleApplyToProduct() {
        setSaving(true);
        setSaveSuccess(false);

        try {
            const res = await fetch('/api/admin/prompt-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language,
                    model: selectedModel,
                    prompt
                })
            });
            const data = await res.json();

            if (data.success) {
                setSaveSuccess(true);
                // 更新本地状态
                setCurrentConfig(prev => ({
                    ...prev,
                    [language]: { model: selectedModel, prompt, updatedAt: data.updatedAt }
                }));
                // 3秒后隐藏成功提示
                setTimeout(() => setSaveSuccess(false), 3000);
            } else {
                setError(data.error || 'Failed to save');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    // 选择源后加载文章列表
    useEffect(() => {
        if (!selectedSourceId) {
            setSourceItems([]);
            setSelectedItemIndex(-1);
            return;
        }

        async function loadItems() {
            setLoadingItems(true);
            try {
                const res = await fetch(`/api/admin/sources/${selectedSourceId}`);
                const data = await res.json();
                setSourceItems(data.items || []);
                setSelectedItemIndex(-1);
            } catch (err) {
                console.error('Load items error:', err);
                setSourceItems([]);
            } finally {
                setLoadingItems(false);
            }
        }
        loadItems();
    }, [selectedSourceId]);

    // 生成摘要
    async function handleGenerate() {
        if (selectedItemIndex < 0 || !prompt.trim()) return;

        setGenerating(true);
        setResult(null);
        setError(null);

        try {
            const res = await fetch('/api/admin/test-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceId: selectedSourceId,
                    itemIndex: selectedItemIndex,
                    model: selectedModel,
                    prompt,
                    language
                })
            });
            const data = await res.json();

            if (data.success) {
                setResult(data);
            } else {
                setError(data.error || 'Unknown error');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    }

    const selectedItem = sourceItems[selectedItemIndex];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>🧪 Prompt 调试</h1>
            </header>

            {loading && <div className={styles.loading}>加载中...</div>}

            {!loading && (
                <div style={{ display: 'grid', gridTemplateColumns: '4fr 6fr', gap: '1.5rem' }}>
                    {/* 左侧：配置区 */}
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        {/* 文章选择 */}
                        <section className={styles.section}>
                            <h2>📄 选择文章</h2>
                            <div className={styles.infoCard}>
                                {/* 信息源选择 */}
                                <div className={styles.formRow}>
                                    <span className={styles.formLabel}>信息源</span>
                                    <select
                                        className={styles.formSelect}
                                        value={selectedSourceId}
                                        onChange={(e) => setSelectedSourceId(e.target.value)}
                                        style={{ flex: 1 }}
                                    >
                                        <option value="">-- 选择信息源 --</option>
                                        {sources.filter(s => s.stats?.totalItems > 0).map(source => (
                                            <option key={source.id} value={source.id}>
                                                {source.name} ({source.stats?.totalItems || 0} 篇)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 文章选择 */}
                                {selectedSourceId && (
                                    <div className={styles.formRow}>
                                        <span className={styles.formLabel}>文章</span>
                                        {loadingItems ? (
                                            <span style={{ color: '#9b9a97' }}>加载中...</span>
                                        ) : (
                                            <select
                                                className={styles.formSelect}
                                                value={selectedItemIndex}
                                                onChange={(e) => setSelectedItemIndex(parseInt(e.target.value))}
                                                style={{ flex: 1 }}
                                            >
                                                <option value={-1}>-- 选择文章 --</option>
                                                {sourceItems.slice(0, 30).map((item, idx) => (
                                                    <option key={idx} value={idx}>
                                                        [{item.wordCount?.toLocaleString() || '?'} 字] {item.title?.slice(0, 50)}...
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                {/* 选中文章预览 */}
                                {selectedItem && (
                                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f7f6f3', borderRadius: '6px' }}>
                                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{selectedItem.title}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#6b6b6b' }}>
                                            <span>📊 {selectedItem.wordCount?.toLocaleString() || '?'} 字</span>
                                            <span style={{ marginLeft: '1rem' }}>📅 {new Date(selectedItem.pubDate).toLocaleDateString('zh-CN')}</span>
                                        </div>
                                        <a
                                            href={selectedItem.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontSize: '0.8rem', color: '#2383e2' }}
                                        >
                                            查看原文 →
                                        </a>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 模型配置 */}
                        <section className={styles.section}>
                            <h2>🤖 模型配置</h2>
                            <div className={styles.infoCard}>
                                <div className={styles.formRow}>
                                    <span className={styles.formLabel}>模型</span>
                                    <select
                                        className={styles.formSelect}
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        style={{ flex: 1 }}
                                    >
                                        {models.map(model => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formRow}>
                                    <span className={styles.formLabel}>语言</span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => setLanguage('zh')}
                                            style={{
                                                padding: '0.4rem 0.75rem',
                                                border: '1px solid #e3e2de',
                                                borderRadius: '4px',
                                                background: language === 'zh' ? '#2383e2' : '#fff',
                                                color: language === 'zh' ? '#fff' : '#37352f',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            中文
                                        </button>
                                        <button
                                            onClick={() => setLanguage('en')}
                                            style={{
                                                padding: '0.4rem 0.75rem',
                                                border: '1px solid #e3e2de',
                                                borderRadius: '4px',
                                                background: language === 'en' ? '#2383e2' : '#fff',
                                                color: language === 'en' ? '#fff' : '#37352f',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            English
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Prompt 编辑器 */}
                        <section className={styles.section}>
                            <h2>✏️ Prompt 模板</h2>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '300px',
                                    padding: '0.75rem',
                                    border: '1px solid #e3e2de',
                                    borderRadius: '6px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    resize: 'vertical'
                                }}
                            />

                            {/* 占位符缺失警告 */}
                            {(!prompt.includes('{title}') || !prompt.includes('{content}')) && (
                                <div style={{
                                    marginTop: '0.5rem',
                                    padding: '0.5rem 0.75rem',
                                    background: '#fef3c7',
                                    border: '1px solid #f59e0b',
                                    borderRadius: '4px',
                                    fontSize: '0.85rem',
                                    color: '#92400e'
                                }}>
                                    ⚠️ <strong>警告：</strong>Prompt 缺少必需的占位符！
                                    {!prompt.includes('{title}') && <span> 缺少 <code>{'{title}'}</code></span>}
                                    {!prompt.includes('{content}') && <span> 缺少 <code>{'{content}'}</code></span>}
                                    <div style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>
                                        AI 需要这些占位符才能获取文章内容。请确保模板末尾包含类似：<br />
                                        <code>News title: {'{title}'}<br />News content: {'{content}'}</code>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={handleGenerate}
                                    disabled={selectedItemIndex < 0 || generating}
                                    className={styles.primaryBtn}
                                >
                                    {generating ? '生成中...' : '🚀 生成结果'}
                                </button>
                                <button
                                    onClick={() => setPrompt(language === 'zh' ? DEFAULT_PROMPT_ZH : DEFAULT_PROMPT_EN)}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        border: '1px solid #e3e2de',
                                        borderRadius: '6px',
                                        background: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    重置为默认
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* 右侧：结果区 */}
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <section className={styles.section}>
                            <h2>📋 生成结果</h2>

                            {error && (
                                <div style={{
                                    padding: '1rem',
                                    background: '#fee2e2',
                                    borderRadius: '6px',
                                    color: '#dc2626',
                                    marginBottom: '1rem'
                                }}>
                                    <strong>错误：</strong> {error}
                                </div>
                            )}

                            {result && (
                                <>
                                    {/* 元信息 */}
                                    <div className={styles.infoCard} style={{ marginBottom: '1rem' }}>
                                        {/* 原文标题 */}
                                        <div style={{
                                            marginBottom: '0.5rem',
                                            fontSize: '0.9rem',
                                            color: '#37352f',
                                            wordBreak: 'break-word'
                                        }}>
                                            <strong>📰 原文：</strong>{result.input?.title}
                                        </div>
                                        {/* 内容预览 */}
                                        {result.input?.contentPreview && (
                                            <div style={{
                                                marginBottom: '0.5rem',
                                                fontSize: '0.8rem',
                                                color: '#6b6b6b',
                                                wordBreak: 'break-word',
                                                background: '#f7f6f3',
                                                padding: '0.5rem',
                                                borderRadius: '4px',
                                                maxHeight: '60px',
                                                overflow: 'hidden'
                                            }}>
                                                <strong>📝 内容：</strong>{result.input.contentPreview}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#6b6b6b' }}>
                                            <span>⏱️ {result.durationMs}ms</span>
                                            <span>🔤 {result.usage?.promptTokens} + {result.usage?.completionTokens} tokens</span>
                                            <span>🤖 {result.model}</span>
                                            {result.debug && (
                                                <span>📊 idx:{result.debug.itemIndex}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 渲染预览 */}
                                    <div className={styles.infoCard} style={{ marginBottom: '1rem' }}>
                                        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>📱 渲染预览</h3>

                                        {/* Headline */}
                                        <div style={{
                                            fontSize: '1.1rem',
                                            fontWeight: 600,
                                            color: '#37352f',
                                            marginBottom: '0.75rem'
                                        }}>
                                            {result.result?.editorNote || result.result?.headline || result.result?.title || '(无标题)'}
                                        </div>

                                        {/* Key Points */}
                                        {result.result?.keyPoints && (
                                            <ul style={{
                                                margin: '0 0 0.75rem',
                                                paddingLeft: '1.25rem',
                                                listStyle: 'disc'
                                            }}>
                                                {result.result.keyPoints.map((point, idx) => (
                                                    <li key={idx} style={{ marginBottom: '0.35rem', color: '#37352f' }}>
                                                        {point}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {/* Summary (旧格式兼容) */}
                                        {result.result?.summary && !result.result?.keyPoints && (
                                            <div style={{ color: '#6b6b6b', marginBottom: '0.75rem' }}>
                                                {result.result.summary}
                                            </div>
                                        )}

                                    </div>

                                    {/* 原文剩余营养 - 独立内容块 */}
                                    {(result.result?.readOriginal || result.result?.readOriginalRecommendation) && (() => {
                                        const readRec = result.result?.readOriginal || result.result?.readOriginalRecommendation;
                                        const score = Math.min(readRec?.score || 0, 3);
                                        return (
                                            <div className={styles.infoCard} style={{ marginBottom: '1rem' }}>
                                                <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>🍎 原文剩余营养</h3>

                                                {/* 评分区域 - 用苹果展示 */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    marginBottom: '0.75rem'
                                                }}>
                                                    <div style={{
                                                        padding: '0.5rem 0',
                                                        fontSize: '1.2rem'
                                                    }}>
                                                        {score > 0 ? '🍎'.repeat(score) : '🫥'}
                                                    </div>
                                                    <span style={{ fontSize: '0.85rem', color: '#6b6b6b' }}>
                                                        {score}/3
                                                    </span>
                                                </div>

                                                {/* 营养成分 */}
                                                {readRec?.reason && (
                                                    <div style={{
                                                        padding: '0.75rem',
                                                        background: '#fef7ed',
                                                        borderRadius: '6px',
                                                        marginBottom: '0.75rem',
                                                        border: '1px solid #fed7aa'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '0.8rem',
                                                            color: '#c2410c',
                                                            marginBottom: '0.25rem',
                                                            fontWeight: 500
                                                        }}>
                                                            🥗 营养成分
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', color: '#9a3412', lineHeight: 1.5 }}>
                                                            {readRec.reason}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 适合食用人群 */}
                                                {readRec?.whoShouldRead && (
                                                    <div style={{
                                                        padding: '0.75rem',
                                                        background: '#f0fdf4',
                                                        borderRadius: '6px',
                                                        border: '1px solid #bbf7d0'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '0.8rem',
                                                            color: '#16a34a',
                                                            marginBottom: '0.25rem',
                                                            fontWeight: 500
                                                        }}>
                                                            👤 适合食用人群
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', color: '#166534', lineHeight: 1.5 }}>
                                                            {readRec.whoShouldRead}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* JSON 原始输出 */}
                                    <div className={styles.infoCard} style={{ marginBottom: '1rem' }}>
                                        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>📄 JSON 输出</h3>
                                        <pre style={{
                                            margin: 0,
                                            padding: '0.75rem',
                                            background: '#1e1e1e',
                                            color: '#d4d4d4',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            overflow: 'auto',
                                            maxHeight: '400px',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word'
                                        }}>
                                            {JSON.stringify(result.result, null, 2)}
                                        </pre>
                                    </div>

                                    {/* 应用到产品 */}
                                    <div className={styles.infoCard}>
                                        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>🚀 应用配置</h3>

                                        {/* 当前配置状态 */}
                                        {currentConfig[language] && (
                                            <div style={{
                                                padding: '0.5rem 0.75rem',
                                                background: '#f7f6f3',
                                                borderRadius: '4px',
                                                marginBottom: '0.75rem',
                                                fontSize: '0.85rem'
                                            }}>
                                                <div style={{ color: '#6b6b6b' }}>
                                                    当前生效配置（{language === 'zh' ? '中文' : 'English'}）:
                                                </div>
                                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                                                    <span>🤖 {currentConfig[language].model}</span>
                                                    <span>📅 {new Date(currentConfig[language].updatedAt).toLocaleString('zh-CN')}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* 保存成功提示 */}
                                        {saveSuccess && (
                                            <div style={{
                                                padding: '0.75rem',
                                                background: '#d1fae5',
                                                borderRadius: '6px',
                                                color: '#047857',
                                                marginBottom: '0.75rem',
                                                fontWeight: 500
                                            }}>
                                                ✓ 配置已保存！下次生成新闻时将使用此配置
                                            </div>
                                        )}

                                        <button
                                            onClick={handleApplyToProduct}
                                            disabled={saving}
                                            className={styles.saveBtn}
                                            style={{ width: '100%' }}
                                        >
                                            {saving ? '保存中...' : `📦 应用当前配置到产品（${language === 'zh' ? '中文' : 'English'}）`}
                                        </button>
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#9b9a97' }}>
                                            将保存当前的模型（{selectedModel}）和 Prompt 模板到生产配置
                                        </div>
                                    </div>
                                </>
                            )}

                            {!result && !error && (
                                <div style={{
                                    padding: '3rem',
                                    textAlign: 'center',
                                    color: '#9b9a97',
                                    background: '#f7f6f3',
                                    borderRadius: '6px'
                                }}>
                                    选择文章后点击「生成结果」查看效果
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
}
