'use client';

import { useState, useEffect } from 'react';
import NewsCardLab from '@/components/NewsCardLab';
import SubscribeModal from '@/components/SubscribeModal';
import Footer from '@/components/Footer';

/**
 * UI Lab - 固定顶部版本
 * 整合 Logo + 日期 + 日期选择器到一个固定的顶栏
 */
export default function UILabPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [subscriberCount, setSubscriberCount] = useState(0);
    const [feedsData, setFeedsData] = useState(null);
    const [language, setLanguage] = useState('zh');
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [availableDates, setAvailableDates] = useState([]);

    // 获取可用日期列表
    const fetchAvailableDates = async (lang) => {
        try {
            const res = await fetch(`/api/dates?lang=${lang}`);
            const data = await res.json();
            setAvailableDates(data.dates || []);
            if (!selectedDate && data.dates?.length > 0) {
                setSelectedDate(data.dates[0]);
            }
        } catch (err) {
            console.error('Error fetching dates:', err);
        }
    };

    // 获取新闻数据
    const fetchFeeds = async (lang, date) => {
        setLoading(true);
        try {
            let url = `/api/feeds?lang=${lang}`;
            if (date) {
                url += `&date=${date}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            setFeedsData(data);
            if (data.date && !selectedDate) {
                setSelectedDate(data.date);
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching feeds:', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAvailableDates(language);
    }, []);

    useEffect(() => {
        fetchAvailableDates(language);
        fetchFeeds(language, selectedDate);
    }, [language]);

    useEffect(() => {
        if (selectedDate) {
            fetchFeeds(language, selectedDate);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetch('/api/subscribe')
            .then(res => res.json())
            .then(data => setSubscriberCount(data.count))
            .catch(console.error);
    }, []);

    // 格式化日期
    const formatDate = (dateStr, lang) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (lang === 'en') {
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        }
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekDay = weekDays[date.getDay()];
        return `${month}月${day}日 · 周${weekDay}`;
    };

    const [scrollProgress, setScrollProgress] = useState(0);

    // 监听滚动计算进度
    useEffect(() => {
        const handleScroll = () => {
            const totalScroll = document.documentElement.scrollTop;
            const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scroll = `${totalScroll / windowHeight}`;
            if (windowHeight > 0) {
                setScrollProgress(Number(scroll));
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
    };

    const handleDateChange = (date) => {
        setSelectedDate(date);
    };

    const sources = feedsData?.sources || [];
    const date = feedsData?.date || selectedDate || new Date().toISOString().split('T')[0];

    const allNews = sources.flatMap(source =>
        (source.items || []).map(item => ({
            ...item,
            sourceName: source.name,
            sourceId: source.id
        }))
    ).sort((a, b) => {
        const dateA = new Date(a.pubDate || 0);
        const dateB = new Date(b.pubDate || 0);
        return dateB - dateA;
    });

    const totalItems = allNews.length;

    const t = {
        newsCount: language === 'zh' ? '颗胶囊' : 'capsules',
        doneMessage: language === 'zh' ? '更新完毕 — 期待你的阅读和发现' : "That's all — enjoy your reading!",
        loading: language === 'zh' ? '加载中...' : 'Loading...',
        noNews: language === 'zh' ? '暂无新闻' : 'No news available',
        subscribe: language === 'zh' ? '订阅' : 'Subscribe',
        title: language === 'zh' ? '新闻胶囊' : 'News Capsule',
    };

    return (
        <div className="lab-theme-minimal">
            {/* 固定顶栏 - 整合所有顶部元素 */}
            <header className="lab-sticky-header">
                {/* 进度条 */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        height: '2px',
                        backgroundColor: 'var(--text-primary)',
                        width: `${scrollProgress * 100}%`,
                        zIndex: 10,
                        transition: 'width 0.1s'
                    }}
                />
                <div className="lab-header-container">
                    {/* 左侧：Logo + 日期信息 */}
                    <div className="lab-header-left">
                        <div className="lab-logo">
                            {language === 'zh' ? (
                                <img
                                    src="/news-capsule-logo-cn2.svg"
                                    alt="News Capsule Logo"
                                    style={{ height: '32px', width: 'auto' }}
                                />
                            ) : (
                                <img
                                    src="/news-capsule-logo-en.svg"
                                    alt="News Capsule Logo"
                                    style={{ height: '32px', width: 'auto' }}
                                />
                            )}
                        </div>
                        <div className="lab-header-divider"></div>
                        <div className="lab-date-info">
                            <span className="lab-date">{formatDate(date, language)}</span>
                            {/* <span className="lab-count">{totalItems} {t.newsCount}</span> */}
                        </div>
                    </div>

                    {/* 右侧：日期切换 + 语言 + 订阅 */}
                    <div className="lab-header-right">
                        {/* 左右箭头日期选择器 */}
                        <div className="lab-date-nav">
                            <button
                                className="lab-date-arrow"
                                onClick={() => {
                                    const currentIndex = availableDates.indexOf(selectedDate);
                                    if (currentIndex < availableDates.length - 1) {
                                        handleDateChange(availableDates[currentIndex + 1]);
                                    }
                                }}
                                disabled={availableDates.indexOf(selectedDate) >= availableDates.length - 1}
                                title={language === 'zh' ? '前一天' : 'Previous day'}
                            >
                                ◀
                            </button>
                            <button
                                className="lab-date-icon"
                                onClick={() => {
                                    // 点击日历图标可以展开下拉
                                    const dropdown = document.getElementById('lab-date-dropdown');
                                    if (dropdown) {
                                        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                                    }
                                }}
                                title={language === 'zh' ? '选择日期' : 'Select date'}
                            >
                                📅
                            </button>
                            <button
                                className="lab-date-arrow"
                                onClick={() => {
                                    const currentIndex = availableDates.indexOf(selectedDate);
                                    if (currentIndex > 0) {
                                        handleDateChange(availableDates[currentIndex - 1]);
                                    }
                                }}
                                disabled={availableDates.indexOf(selectedDate) <= 0}
                                title={language === 'zh' ? '后一天' : 'Next day'}
                            >
                                ▶
                            </button>
                            {/* 隐藏的日期下拉 */}
                            <div id="lab-date-dropdown" className="lab-date-dropdown" style={{ display: 'none' }}>
                                {availableDates.map((d) => (
                                    <button
                                        key={d}
                                        className={`lab-date-option ${d === selectedDate ? 'active' : ''}`}
                                        onClick={() => {
                                            handleDateChange(d);
                                            document.getElementById('lab-date-dropdown').style.display = 'none';
                                        }}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            className="lab-btn lab-btn-ghost"
                            onClick={toggleLanguage}
                        >
                            {language === 'zh' ? 'EN' : '中'}
                        </button>
                    </div>
                </div>
            </header>

            {/* 主内容区 - 添加顶部间距 */}
            <main className="lab-main">
                <div className="container">
                    {loading ? (
                        <div className="loading-state">
                            <p>{t.loading}</p>
                        </div>
                    ) : allNews.length === 0 ? (
                        <div className="empty-state">
                            <p>{t.noNews}</p>
                        </div>
                    ) : (
                        <>
                            <div className="news-list">
                                {allNews.map((item, index) => (
                                    <NewsCardLab
                                        key={item.id}
                                        item={item}
                                        sourceName={item.sourceName}
                                        language={language}
                                        index={index}
                                    />
                                ))}
                            </div>

                            <div className="footer-subscription" style={{
                                textAlign: 'center',
                                padding: '32px 0 0 0',
                                marginBottom: '20px',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px'
                            }}>
                                <p style={{
                                    fontSize: '0.9375rem',
                                    color: 'var(--text-secondary)',
                                    marginBottom: 0
                                }}>
                                    {language === 'zh' ? '喜欢新闻胶囊？' : 'Like News Capsule?'}
                                </p>
                                <button
                                    className="lab-btn lab-btn-primary"
                                    onClick={() => setIsModalOpen(true)}
                                    style={{
                                        padding: '6px 16px',
                                        fontSize: '0.875rem',
                                        backgroundColor: 'var(--text-primary)',
                                        border: 'none',
                                        borderRadius: '20px'
                                    }}
                                >
                                    {language === 'zh' ? '订阅' : 'Subscribe'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>

            <Footer language={language} />

            <SubscribeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                subscriberCount={subscriberCount}
                language={language}
            />
        </div>
    );
}
