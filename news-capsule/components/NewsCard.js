'use client';

/**
 * NewsCard - 单条新闻完整展示卡片
 * 布局：原标题 → 新闻源 → editorNote → keyPoints → readOriginal → 原文链接
 */
export default function NewsCard({ item, sourceName, language }) {
    const {
        // 新格式
        editorNote,
        keyPoints,
        readOriginal,
        // 旧格式兼容
        title,
        highlights,
        impact,
        // 通用字段
        originalTitle,
        link,
        pubDate,
        wordCount
    } = item;

    const t = {
        readOriginal: language === 'zh' ? '阅读原文' : 'Read Original',
        readTime: language === 'zh' ? '约' : 'Est.',
        nutrition: language === 'zh' ? '原文剩余营养' : 'Original Value',
        nutrients: language === 'zh' ? '营养成分' : 'Nutrients',
        whoShouldRead: language === 'zh' ? '适合阅读人群' : 'Who Should Read'
    };

    // 计算阅读时间（区分中英文）
    const calculateReadTime = (count, lang) => {
        if (!count) return null;
        const wordsPerMin = lang === 'en' ? 300 : 800;
        return `${Math.max(1, Math.ceil(count / wordsPerMin))} min`;
    };
    const estimatedReadTime = calculateReadTime(wordCount, language);

    // 格式化发布时间
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

    // 渲染评分（0-3分制，分数就是红苹果数量）
    const renderScore = (score) => {
        const maxScore = 3;
        // 直接使用分数（0-3），确保在有效范围内
        const normalized = Math.min(maxScore, Math.max(0, score || 0));

        const apples = [];
        for (let i = 0; i < maxScore; i++) {
            if (i < normalized) {
                // 彩色苹果
                apples.push(<span key={i} className="apple-filled">🍎</span>);
            } else {
                // 灰色苹果（用 CSS filter 变灰）
                apples.push(<span key={i} className="apple-empty">🍎</span>);
            }
        }
        return apples;
    };

    // 获取简化的分数显示
    const getSimpleScore = (score) => {
        if (score >= 4) return 3;
        if (score >= 3) return 2;
        if (score >= 1) return 1;
        return 0;
    };

    // 获取显示的标题/概要
    const displayNote = editorNote || title || '';
    const points = keyPoints || highlights || [];

    return (
        <article className="news-card">
            {/* 原标题 */}
            <h3 className="news-card-title">{originalTitle}</h3>

            {/* 新闻源 + 时间 */}
            <div className="news-card-meta">
                <span className="news-card-source">{sourceName}</span>
                {pubDate && <span className="news-card-time">{formatPubDate(pubDate)}</span>}
            </div>

            {/* 编辑概要 / editorNote */}
            {displayNote && (
                <div className="news-card-note">
                    <p>{displayNote}</p>
                </div>
            )}

            {/* 关键要点 / keyPoints */}
            {points.length > 0 && (
                <div className="news-card-keypoints">
                    <ul>
                        {points.map((point, idx) => (
                            <li key={idx}>{point}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 影响分析 - 旧格式兼容 */}
            {impact && !readOriginal && (
                <div className="news-card-impact">
                    <p>💡 {impact}</p>
                </div>
            )}

            {/* 阅读原文推荐 */}
            {readOriginal && (
                <div className="news-card-read-original">
                    <div className="read-original-header">
                        <span className="nutrition-score">{renderScore(readOriginal.score)}</span>
                        <span className="nutrition-label">{t.nutrition}</span>
                    </div>

                    {readOriginal.reason && (
                        <div className="nutrition-reason">
                            <span className="reason-label">🥗 {t.nutrients}</span>
                            <p>{readOriginal.reason}</p>
                        </div>
                    )}

                    {readOriginal.whoShouldRead && (
                        <div className="who-should-read">
                            <span className="who-label">👤 {t.whoShouldRead}</span>
                            <p>{readOriginal.whoShouldRead}</p>
                        </div>
                    )}
                </div>
            )}

            {/* 原文链接和阅读时长 */}
            <div className="news-card-footer">
                {link && (
                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="news-card-link"
                    >
                        📎 {t.readOriginal}
                    </a>
                )}
                {estimatedReadTime && (
                    <span className="news-card-readtime">
                        ⏱ {t.readTime} {estimatedReadTime}
                    </span>
                )}
                {wordCount && (
                    <span className="news-card-wordcount">
                        📊 {wordCount.toLocaleString()} {language === 'zh' ? '字' : 'words'}
                    </span>
                )}
            </div>
        </article>
    );
}
