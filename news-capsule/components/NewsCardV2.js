'use client';

/**
 * NewsCardV2 - 优化版新闻卡片
 * 使用 Heroicons SVG 替代 emoji，优化交互和视觉效果
 */

// SVG 图标组件
const Icons = {
    // 苹果图标 - 填充状态
    AppleFilled: () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="icon-apple icon-apple-filled">
            <path d="M17.28 9.28a5.5 5.5 0 00-5.03-3.28c-.96 0-1.75.24-2.44.55-.58.26-1.07.58-1.53.83-.37.2-.71.37-1.03.42-.32-.05-.66-.22-1.03-.42-.46-.25-.95-.57-1.53-.83-.69-.31-1.48-.55-2.44-.55A5.5 5.5 0 00.75 9.75c0 .55.13 1.07.35 1.53.56 1.16 1.5 2.17 2.28 3.03.39.43.75.82 1.02 1.16.27.34.45.61.52.81.13.37.33.83.52 1.22.38.78.86 1.62 1.35 2.15.24.26.47.46.7.58.24.12.48.17.76.17s.52-.05.76-.17c.23-.12.46-.32.7-.58.49-.53.97-1.37 1.35-2.15.19-.39.39-.85.52-1.22.07-.2.25-.47.52-.81.27-.34.63-.73 1.02-1.16.78-.86 1.72-1.87 2.28-3.03.22-.46.35-.98.35-1.53 0-.84-.19-1.62-.47-2.28zM12 3.5c-.55 0-1-.45-1-1 0-.36.2-.68.5-.87.3-.19.68-.19.98 0 .3.19.5.51.5.87 0 .55-.45 1-1 1z" />
        </svg>
    ),
    // 苹果图标 - 空状态
    AppleEmpty: () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="icon-apple icon-apple-empty">
            <path d="M17.28 9.28a5.5 5.5 0 00-5.03-3.28c-.96 0-1.75.24-2.44.55-.58.26-1.07.58-1.53.83-.37.2-.71.37-1.03.42-.32-.05-.66-.22-1.03-.42-.46-.25-.95-.57-1.53-.83-.69-.31-1.48-.55-2.44-.55A5.5 5.5 0 00.75 9.75c0 .55.13 1.07.35 1.53.56 1.16 1.5 2.17 2.28 3.03.39.43.75.82 1.02 1.16.27.34.45.61.52.81.13.37.33.83.52 1.22.38.78.86 1.62 1.35 2.15.24.26.47.46.7.58.24.12.48.17.76.17s.52-.05.76-.17c.23-.12.46-.32.7-.58.49-.53.97-1.37 1.35-2.15.19-.39.39-.85.52-1.22.07-.2.25-.47.52-.81.27-.34.63-.73 1.02-1.16.78-.86 1.72-1.87 2.28-3.03.22-.46.35-.98.35-1.53 0-.84-.19-1.62-.47-2.28zM12 3.5c-.55 0-1-.45-1-1 0-.36.2-.68.5-.87.3-.19.68-.19.98 0 .3.19.5.51.5.87 0 .55-.45 1-1 1z" />
        </svg>
    ),
    // 外部链接
    ExternalLink: () => (
        <svg viewBox="0 0 20 20" fill="currentColor" className="icon">
            <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
        </svg>
    ),
    // 时钟
    Clock: () => (
        <svg viewBox="0 0 20 20" fill="currentColor" className="icon">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
        </svg>
    ),
    // 文档
    Document: () => (
        <svg viewBox="0 0 20 20" fill="currentColor" className="icon">
            <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
        </svg>
    ),
    // 星星/闪光
    Sparkles: () => (
        <svg viewBox="0 0 20 20" fill="currentColor" className="icon">
            <path d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.05a.75.75 0 011.06 0l1.062 1.06A.75.75 0 116.11 5.173L5.05 4.11a.75.75 0 010-1.06zm9.9 0a.75.75 0 010 1.06l-1.06 1.062a.75.75 0 01-1.062-1.061l1.061-1.06a.75.75 0 011.06 0zM10 7a3 3 0 100 6 3 3 0 000-6zm-6.75 2.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H4a.75.75 0 01-.75-.75zm12.5 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM6.11 14.828a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 11-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zm8.84 0a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.061l-1.06-1.06a.75.75 0 010-1.061zM10 17a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 17z" />
        </svg>
    ),
    // 用户组
    UserGroup: () => (
        <svg viewBox="0 0 20 20" fill="currentColor" className="icon">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 01-2.07.654 2.33 2.33 0 00.025-.654 6.484 6.484 0 00-1.905-3.96 3 3 0 014.308 3.517.78.78 0 01-.358.442zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
        </svg>
    ),
};

export default function NewsCardV2({ item, sourceName, language }) {
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
        wordCount
    } = item;

    const t = {
        readOriginal: language === 'zh' ? '阅读原文' : 'Read Original',
        readTime: language === 'zh' ? '约' : 'Est.',
        nutrition: language === 'zh' ? '原文剩余营养' : 'Original Value',
        nutrients: language === 'zh' ? '营养成分' : 'Nutrients',
        whoShouldRead: language === 'zh' ? '适合阅读人群' : 'Who Should Read'
    };

    const estimatedReadTime = wordCount ? `${Math.ceil(wordCount / 300)} min` : null;

    const formatPubDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (language === 'zh') {
            return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // 使用 SVG 图标渲染评分
    const renderScore = (score) => {
        const maxScore = 3;
        const normalized = Math.min(maxScore, Math.max(0, score || 0));
        const apples = [];
        for (let i = 0; i < maxScore; i++) {
            if (i < normalized) {
                apples.push(<Icons.AppleFilled key={i} />);
            } else {
                apples.push(<Icons.AppleEmpty key={i} />);
            }
        }
        return apples;
    };

    const displayNote = editorNote || title || '';
    const points = keyPoints || highlights || [];

    return (
        <article className="news-card-v2">
            <h3 className="news-card-v2-title">{originalTitle}</h3>

            <div className="news-card-v2-meta">
                <span className="news-card-v2-source">{sourceName}</span>
                {pubDate && <span className="news-card-v2-time">{formatPubDate(pubDate)}</span>}
            </div>

            {displayNote && (
                <div className="news-card-v2-note">
                    <p>{displayNote}</p>
                </div>
            )}

            {points.length > 0 && (
                <div className="news-card-v2-keypoints">
                    <ul>
                        {points.map((point, idx) => (
                            <li key={idx}>{point}</li>
                        ))}
                    </ul>
                </div>
            )}

            {impact && !readOriginal && (
                <div className="news-card-v2-impact">
                    <Icons.Sparkles />
                    <p>{impact}</p>
                </div>
            )}

            {readOriginal && (
                <div className="news-card-v2-read-original">
                    <div className="read-original-header-v2">
                        <span className="nutrition-score-v2">{renderScore(readOriginal.score)}</span>
                        <span className="nutrition-label-v2">{t.nutrition}</span>
                    </div>

                    {readOriginal.reason && (
                        <div className="nutrition-reason-v2">
                            <span className="reason-label-v2">
                                <Icons.Sparkles />
                                {t.nutrients}
                            </span>
                            <p>{readOriginal.reason}</p>
                        </div>
                    )}

                    {readOriginal.whoShouldRead && (
                        <div className="who-should-read-v2">
                            <span className="who-label-v2">
                                <Icons.UserGroup />
                                {t.whoShouldRead}
                            </span>
                            <p>{readOriginal.whoShouldRead}</p>
                        </div>
                    )}
                </div>
            )}

            <div className="news-card-v2-footer">
                {link && (
                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="news-card-v2-link"
                    >
                        <Icons.ExternalLink />
                        {t.readOriginal}
                    </a>
                )}
                {estimatedReadTime && (
                    <span className="news-card-v2-readtime">
                        <Icons.Clock />
                        {t.readTime} {estimatedReadTime}
                    </span>
                )}
                {wordCount && (
                    <span className="news-card-v2-wordcount">
                        <Icons.Document />
                        {wordCount.toLocaleString()} {language === 'zh' ? '字' : 'words'}
                    </span>
                )}
            </div>
        </article>
    );
}
