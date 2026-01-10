'use client';

/**
 * NewsCardLab - 简化版新闻卡片（ui-lab 专用）
 * 优化：营养区块简化，减少色彩层次
 */
export default function NewsCardLab({ item, sourceName, language, index }) {
    const {
        editorNote,
        keyPoints,
        readOriginal,
        title,
        highlights,
        impact,
        originalTitle,
        link,
        pubDate,
        wordCount,
        sourceLanguage // 文章源语言
    } = item;

    const t = {
        readOriginal: language === 'zh' ? '阅读原文' : 'Read Original',
        readTime: language === 'zh' ? '约' : 'Est.',
        nutrition: language === 'zh' ? '原文剩余营养' : 'Original Value',
        nutrients: language === 'zh' ? '营养成分' : 'Nutrients',
        whoShouldRead: language === 'zh' ? '适合阅读人群' : 'Who Should Read'
    };

    // 计算阅读时间（基于文章源语言，而非界面语言）
    const calculateReadTime = (count, lang) => {
        if (!count) return null;
        const wordsPerMin = lang === 'en' ? 300 : 800;
        return Math.max(1, Math.ceil(count / wordsPerMin));
    };
    // 优先使用文章源语言，回退到界面语言
    const articleLanguage = sourceLanguage || language;
    const estimatedReadTime = wordCount ? `${calculateReadTime(wordCount, articleLanguage)} min` : null;

    const formatPubDate = (dateStr) => {
        if (!dateStr) return '';
        // 兼容 Safari/iOS: 如果是 YYYY-MM-DD 格式，添加时间部分
        let normalizedDateStr = dateStr;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            normalizedDateStr = dateStr + 'T00:00:00';
        }
        const date = new Date(normalizedDateStr);
        // 检查日期是否有效
        if (isNaN(date.getTime())) return '';
        if (language === 'zh') {
            return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // 渲染评分（简化版 - 放在标题后面）
    const renderScore = (score) => {
        const maxScore = 3;
        const normalized = Math.min(maxScore, Math.max(0, score || 0));
        const apples = [];
        for (let i = 0; i < maxScore; i++) {
            if (i < normalized) {
                apples.push(<span key={i} className="apple-filled">🍎</span>);
            } else {
                apples.push(<span key={i} className="apple-empty">🍎</span>);
            }
        }
        return apples;
    };

    const displayNote = editorNote || title || '';
    const points = keyPoints || highlights || [];

    return (
        <article className="news-card">
            {/* 序号：No. 01 */}
            <div className="news-card-index">
                No. {String((index || 0) + 1).padStart(2, '0')}
            </div>

            <h3 className="news-card-title">{originalTitle}</h3>

            <div className="news-card-meta">
                <span className="news-card-source">{sourceName}</span>
                {pubDate && <span className="news-card-time">{formatPubDate(pubDate)}</span>}
            </div>

            {displayNote && (
                <div className="news-card-note">
                    <p>{displayNote}</p>
                </div>
            )}

            {points.length > 0 && (
                <div className="news-card-keypoints">
                    <ul>
                        {points.map((point, idx) => (
                            <li key={idx}>{point}</li>
                        ))}
                    </ul>
                </div>
            )}

            {impact && !readOriginal && (
                <div className="news-card-impact">
                    <p>💡 {impact}</p>
                </div>
            )}

            {/* 简化版阅读原文推荐 - 无子区块独立背景 */}
            {readOriginal && (
                <div className="news-card-nutrition-simple">
                    {/* 标题行：原文剩余营养 + 苹果评分 */}
                    <div className="nutrition-header-simple">
                        <span className="nutrition-title-simple">{t.nutrition}</span>
                        <span className="nutrition-score-simple">{renderScore(readOriginal.score)}</span>
                    </div>

                    {/* 营养成分 - 无独立背景 */}
                    {readOriginal.reason && (
                        <div className="nutrition-item-simple">
                            <span className="nutrition-item-label">{t.nutrients}</span>
                            <p>{readOriginal.reason}</p>
                        </div>
                    )}

                    {/* 适合阅读人群 - 无独立背景 */}
                    {readOriginal.whoShouldRead && (
                        <div className="nutrition-item-simple">
                            <span className="nutrition-item-label">{t.whoShouldRead}</span>
                            <p>{readOriginal.whoShouldRead}</p>
                        </div>
                    )}

                    {/* 新版阅读原文链接 - 整合在营养框底部 */}
                    {link && (
                        <div className="nutrition-action-simple" style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-divider)' }}>
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="news-card-link"
                                style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}
                            >
                                📎 {language === 'zh'
                                    ? `用 ${calculateReadTime(wordCount, articleLanguage) || 1} 分钟阅读原文`
                                    : `Read original in ${calculateReadTime(wordCount, articleLanguage) || 1} min`}
                            </a>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}
