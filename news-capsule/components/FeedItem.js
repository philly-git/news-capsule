'use client';

import { useState } from 'react';

export default function FeedItem({ item, language }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const { title, summary, readOriginalRecommendation, readTime, source, originalTitle } = item;

    const t = {
        expand: language === 'zh' ? '展开' : 'Expand',
        collapse: language === 'zh' ? '收起' : 'Collapse',
        readOriginal: language === 'zh' ? '阅读原文' : 'Read Original',
        readTime: language === 'zh' ? '约' : 'Est.',
        recommendLabel: language === 'zh' ? '推荐阅读原文' : 'Recommend reading original'
    };

    // 渲染星级评分
    const renderStars = (score) => {
        const fullStars = Math.min(5, Math.max(1, score));
        return '⭐'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
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
                <h3 className="feed-item-title">{title || originalTitle}</h3>
            </div>

            {isExpanded && (
                <div className="feed-item-details">
                    {/* AI 总结 */}
                    <div className="feed-item-summary">
                        <p>{summary}</p>
                    </div>

                    {/* 阅读推荐 */}
                    {readOriginalRecommendation && (
                        <div className="feed-item-recommendation">
                            <div className="recommendation-score">
                                <span className="stars">
                                    {renderStars(readOriginalRecommendation.score)}
                                </span>
                                <span className="score-label">
                                    ({readOriginalRecommendation.score}/5)
                                </span>
                            </div>
                            {readOriginalRecommendation.reason && (
                                <p className="recommendation-reason">
                                    {readOriginalRecommendation.reason}
                                </p>
                            )}
                        </div>
                    )}

                    {/* 原文链接 */}
                    <div className="feed-item-actions">
                        <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="read-original-link"
                        >
                            📎 {t.readOriginal}
                        </a>
                        {readTime && (
                            <span className="read-time">
                                ⏱ {t.readTime} {readTime}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </article>
    );
}
