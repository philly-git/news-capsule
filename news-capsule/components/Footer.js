'use client';

import { useState } from 'react';
import Link from 'next/link';
import FeedbackModal from './FeedbackModal';

export default function Footer({ language = 'zh' }) {
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    return (
        <footer className="page-footer">
            <div className="container">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ margin: 0 }}>
                        {language === 'zh' ? (
                            <>
                                如果你有任何反馈，或者想要看到更多的新闻源，请联系我们的
                                <button
                                    onClick={() => setIsFeedbackOpen(true)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        font: 'inherit',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        textUnderlineOffset: '4px',
                                        color: 'inherit',
                                        marginLeft: '4px'
                                    }}
                                >
                                    编辑部
                                </button>
                            </>
                        ) : (
                            <>
                                If you have any feedback or want to see more news sources, please contact our
                                <button
                                    onClick={() => setIsFeedbackOpen(true)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        font: 'inherit',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        textUnderlineOffset: '4px',
                                        color: 'inherit',
                                        marginLeft: '4px'
                                    }}
                                >
                                    editorial department
                                </button>
                            </>
                        )}
                    </p>
                    <div>
                        <Link href={`/about?lang=${language}`} style={{ textDecoration: 'underline', textUnderlineOffset: '4px' }}>
                            {language === 'zh' ? '关于新闻胶囊' : 'About News Capsule'}
                        </Link>
                    </div>
                </div>
            </div>

            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
                language={language}
            />
        </footer>
    );
}
