'use client';

import { useState } from 'react';

export default function NewsCard({ news, language = 'zh' }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { title, highlights, keyInfo, context, source } = news;

    // 检查是否有拓展内容可显示
    const hasExpandableContent = keyInfo?.length > 0 || context;

    const t = {
        expand: language === 'zh' ? '展开详情' : 'Show Details',
        collapse: language === 'zh' ? '收起' : 'Hide',
        keyInfo: language === 'zh' ? '关键信息' : 'Key Facts',
        context: language === 'zh' ? '背景' : 'Context',
        readOriginal: language === 'zh' ? '阅读原文' : 'Read Original',
        readTime: language === 'zh' ? '预计' : 'Est.',
    };

    return (
        <article className="card">
            <h2 className="card-title">{title}</h2>

            <ul className="card-highlights">
                {highlights.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                ))}
            </ul>

            {/* 展开/折叠按钮 */}
            {hasExpandableContent && (
                <button
                    className="card-expand-toggle"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                >
                    <span className="card-expand-icon">
                        {isExpanded ? '▲' : '▼'}
                    </span>
                    {isExpanded ? t.collapse : t.expand}
                </button>
            )}

            {/* 拓展内容区域 */}
            {isExpanded && hasExpandableContent && (
                <div className="card-details">
                    {/* 关键信息 */}
                    {keyInfo && keyInfo.length > 0 && (
                        <div className="card-key-info">
                            <span className="card-section-icon">📊</span>
                            <div className="card-section-content">
                                <h4 className="card-section-title">{t.keyInfo}</h4>
                                <ul className="card-key-info-list">
                                    {keyInfo.map((info, index) => (
                                        <li key={index}>{info}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* 背景 */}
                    {context && (
                        <div className="card-context">
                            <span className="card-section-icon">📖</span>
                            <div className="card-section-content">
                                <h4 className="card-section-title">{t.context}</h4>
                                <p>{context}</p>
                            </div>
                        </div>
                    )}



                    {/* 原文链接 */}
                    <div className="card-read-original">
                        <span className="card-section-icon">📎</span>
                        <div className="card-section-content">
                            <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="card-original-link"
                            >
                                {t.readOriginal}：{source.name}
                            </a>
                            {source.readTime && (
                                <span className="card-read-time">
                                    ⏱ {t.readTime} {source.readTime}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
}
