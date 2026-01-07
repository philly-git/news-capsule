'use client';

import { useState } from 'react';
import FeedItem from './FeedItem';

export default function SourceGroup({ source, items, language, defaultExpanded = false }) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const t = {
        items: language === 'zh' ? '条' : 'items'
    };

    return (
        <section className="source-group">
            <header
                className="source-group-header"
                onClick={() => setIsExpanded(!isExpanded)}
                role="button"
                aria-expanded={isExpanded}
            >
                <span className="source-group-toggle">
                    {isExpanded ? '▼' : '▶'}
                </span>
                <h2 className="source-group-name">{source.name}</h2>
                <span className="source-group-count">
                    ({items.length} {t.items})
                </span>
            </header>

            {isExpanded && (
                <div className="source-group-items">
                    {items.map((item) => (
                        <FeedItem
                            key={item.id}
                            item={item}
                            language={language}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
