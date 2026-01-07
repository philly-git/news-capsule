'use client';

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

// 默认的新版 Prompt 模板
const DEFAULT_PROMPT_ZH = `你是一个专业的新闻编辑。你的读者是一群想要快速掌握新闻关键信息的知识工作者，他们希望你能对下面的新闻进行概述，并提供是否需要阅读原文的建议，下面是具体要求：

## 输出要求

### 1. editorNote（编辑概要）
站在一个专业编辑的角度对新闻稿进行简要评述：
- 30-50个中文字
- 突出最重要的信息点（公司、产品、数字）
- 可以带入'编辑'的角色给出简短的观点或评述

### 2. keyPoints（关键要点）
提取3-4个核心要点，每个要点：
- 一句话，15-30字
- 包含具体信息（数字、名称、时间等）
- 按重要性排序，最重要的放第一条
- 避免重复 editorNote 中已有的信息

### 3. readOriginal（阅读原文推荐）
评估「读完editorNote和keyPoints后，原文还剩多少独有价值」：

**score 评分标准：**
- 5分：原文有独家内容（专访、内部消息、独家数据），摘要无法替代
- 4分：原文有完整的数据表格、对比图、代码示例等结构化内容
- 3分：原文有更多细节，但核心信息已在摘要中
- 2分：原文是官方公告或新闻稿，摘要已完整概括
- 1分：原文内容较少或质量一般，摘要已完整呈现全部价值

**reason 理由要求：**
- 必须具体说明原文有什么摘要没有的内容
- 好的例子："原文附有5款竞品的规格对比表"、"含 CEO 专访原文"、"摘要已完整，原文无关键新增"
- 禁止使用笼统词汇如"技术细节"、"详细信息"、"更多内容"

## JSON 输出格式样本

{
  "editorNote": "三星冰箱支持语音开关门，CES 2026 智能家居再升级",
  "keyPoints": [
    "通过 Bixby 语音指令即可开关冰箱门，门开启角度超过90度",
    "支持手掌轻拍激活，适合烹饪时手部不便的场景",
    "Family Hub 系列专属功能，具体上市时间未公布"
  ],
  "readOriginal": {
    "score": 2,
    "reason": "官方功能公告，摘要已覆盖全部要点"
  }
}

---

新闻标题: {title}
新闻内容: {content}
来源: {source}`;

const DEFAULT_PROMPT_EN = `You are a professional news editor. Your readers are knowledge workers who want to quickly grasp key news information. They want you to summarize the following news and provide a recommendation on whether to read the original. Here are the specific requirements:

## Output Requirements

### 1. editorNote
A brief editorial comment on the news article from a professional editor's perspective:
- 20-40 words
- Highlight the most important info (company, product, numbers)
- Can include editorial perspective or brief commentary

### 2. keyPoints
Extract 3-4 key points, each point should:
- Be one sentence, 15-30 words
- Include specific info (numbers, names, dates)
- Be ordered by importance
- Avoid repeating what's already in editorNote

### 3. readOriginal
Evaluate how much unique, decision-relevant value remains in the original after reading editorNote + keyPoints.

Return a structured recommendation that is actionable.

Required fields:
- score: 1-5 
- reason: 25-45 words, MUST mention concrete artifacts the original contains that the summary cannot replicate
  (e.g., "a pricing table across 5 tiers", "verbatim CEO Q&A", "linked SEC filing", "benchmark chart", "methodology/sample size").
  DO NOT use vague phrases like "more details" or "technical info".
- whoShouldRead: 12-25 words describing the target reader and scenario.


Score criteria (how much unique value remains in the original after the summary)：
- 5: Irreplaceable primary/exclusive material that could change interpretation or be cited.
     Examples: verbatim interview/Q&A or transcript; primary documents (regulatory filings, court docs, patent text, earnings call transcript);
     unique dataset or detailed methodology sufficient to verify claims.

- 4: Dense reference material that users will compare, reuse, or implement (even if not exclusive).
     Examples: full pricing/spec comparison tables; benchmark charts with underlying numbers; step-by-step implementation details (configs, code snippets, API params);
     complete lists (vendors, SKUs, regions, timelines) not fully captured in the summary.

- 3: Meaningful nuance remains, mainly "why/so-what/boundaries" beyond the core facts.
     Examples: clear constraints and exceptions; rollout scope and dates; non-obvious trade-offs; background context that affects decision-making for certain readers.

- 2: Mostly official announcement/press release or straightforward recap; the summary captures nearly all actionable info.
     Reading the original mainly adds wording, minor clarifications, or confirmation of quotes.

- 1: Low information density or low-quality content; original adds almost nothing beyond the summary.
     Examples: vague claims without sources; heavy repetition; clickbait framing with few verifiable details.


## JSON Output Format

{
  "editorNote": "Samsung fridge now opens with voice commands at CES 2026",
  "keyPoints": [
    "Bixby voice commands can open/close fridge door, opening beyond 90 degrees",
    "Also supports palm tap activation for hands-busy cooking scenarios",
    "Exclusive to Family Hub series, release date not announced"
  ],
  "readOriginal": {
    "score": 2,
    "reason": "Official feature announcement, summary covers all key points",
    "whoShouldRead": "Reader with computer science background or working experience"
  }
}

---

**IMPORTANT: You MUST output everything in English, even if the news article is in another language.**

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
