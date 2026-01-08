'use client';

import { useState } from 'react';

export default function FeedItem({ item, language }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // 兼容多种数据格式
    const {
        // 新格式
        editorNote,
        keyPoints,
        readOriginal,
        // 旧格式兼容
        title,
        summary,
        highlights,
        impact,
        readOriginalRecommendation,
        readTime,
        // 通用字段
        source,
        link,
        originalTitle,
        wordCount
    } = item;

    const t = {
        expand: language === 'zh' ? '展开' : 'Expand',
        collapse: language === 'zh' ? '收起' : 'Collapse',
        readOriginal: language === 'zh' ? '阅读原文' : 'Read Original',
        readTime: language === 'zh' ? '约' : 'Est.',
        keyPoints: language === 'zh' ? '要点' : 'Key Points',
        nutrition: language === 'zh' ? '原文剩余营养' : 'Original Value',
        nutrients: language === 'zh' ? '营养成分' : 'Nutrients',
        whoShouldRead: language === 'zh' ? '适合阅读人群' : 'Who Should Read'
    };

    // 获取阅读推荐对象（兼容新旧格式）
    const readRec = readOriginal || readOriginalRecommendation;

    // 计算阅读时间（如果没有提供）
    const estimatedReadTime = readTime || (wordCount ? `${Math.ceil(wordCount / 300)} min` : null);

    // 获取原文链接 - 兼容新旧格式
    const originalUrl = link || source?.url;

    // 获取显示标题 - 优先使用 editorNote
    const displayTitle = editorNote || title || originalTitle;

    // 获取要点列表 - 兼容 keyPoints 和 highlights
    const points = keyPoints || highlights;

    // 渲染评分（用苹果表示）
    const renderScore = (score) => {
        const normalizedScore = Math.min(5, Math.max(0, score || 0));
        if (normalizedScore === 0) return '🫥';
        return '🍎'.repeat(normalizedScore);
    };

    return (
        <article className="feed-item">
            <div
                className="feed-item-header"
                onClick={() => setIsExpanded(!isExpanded)}
                role="button"
                aria-expanded={isExpanded}
            >
                <span className="feed-item-toggle">
                    {isExpanded ? '▼' : '▶'}
                </span>
                <h3 className="feed-item-title">{displayTitle}</h3>
            </div>

            {isExpanded && (
                <div className="feed-item-details">
                    {/* 关键要点 */}
                    {points && points.length > 0 && (
                        <div className="feed-item-keypoints">
                            <ul>
                                {points.map((point, idx) => (
                                    <li key={idx}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* 影响分析 - 旧格式兼容 */}
                    {impact && !readRec && (
                        <div className="feed-item-impact">
                            <p>💡 {impact}</p>
                        </div>
                    )}

                    {/* 旧格式 summary */}
                    {summary && !points && (
                        <div className="feed-item-summary">
                            <p>{summary}</p>
                        </div>
                    )}

                    {/* 阅读原文推荐 - 美化展示 */}
                    {readRec && (
                        <div className="feed-item-read-original">
                            <div className="read-original-header">
                                <span className="nutrition-score">
                                    {renderScore(readRec.score)}
                                </span>
                                <span className="nutrition-label">
                                    {t.nutrition} ({readRec.score}/5)
                                </span>
                            </div>

                            {readRec.reason && (
                                <div className="nutrition-reason">
                                    <span className="reason-label">🥗 {t.nutrients}</span>
                                    <p>{readRec.reason}</p>
                                </div>
                            )}

                            {readRec.whoShouldRead && (
                                <div className="who-should-read">
                                    <span className="who-label">👤 {t.whoShouldRead}</span>
                                    <p>{readRec.whoShouldRead}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 原文链接和阅读时间 */}
                    <div className="feed-item-actions">
                        {originalUrl && (
                            <a
                                href={originalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="read-original-link"
                            >
                                📎 {t.readOriginal}
                            </a>
                        )}
                        {estimatedReadTime && (
                            <span className="read-time">
                                ⏱ {t.readTime} {estimatedReadTime}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </article>
    );
}
