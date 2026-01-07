'use client';

export default function Header({ onSubscribeClick, language = 'zh', onLanguageToggle }) {
    return (
        <header className="header">
            <div className="container">
                <div className="header-content">
                    <div className="logo">
                        <span className="logo-icon">💊</span>
                        <span>{language === 'zh' ? '新闻胶囊' : 'News Capsule'}</span>
                    </div>
                    <div className="header-actions">
                        <button
                            className="btn btn-ghost"
                            onClick={onLanguageToggle}
                            title={language === 'zh' ? 'Switch to English' : '切换到中文'}
                        >
                            {language === 'zh' ? 'EN' : '中'}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={onSubscribeClick}
                        >
                            📬 {language === 'zh' ? '订阅更新' : 'Subscribe'}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
