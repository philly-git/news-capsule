'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import NewsCardLab from '@/components/NewsCardLab';
import SubscribeModal from '@/components/SubscribeModal';
import Footer from '@/components/Footer';

/**
 * 新闻胶囊首页
 * 整合 Logo + 日期 + 日期选择器到一个固定的顶栏
 */
function HomeContent() {
  const searchParams = useSearchParams();
  const initialLang = searchParams.get('lang') === 'en' ? 'en' : 'zh';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedsData, setFeedsData] = useState(null);
  const [language, setLanguage] = useState(initialLang);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

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

  // 动态更新网页标题
  useEffect(() => {
    if (language === 'zh') {
      document.title = "新闻胶囊 - AI时代的新闻阅读方式";
    } else {
      document.title = "News Capsule - News Reading in the AI Era";
    }
  }, [language]);



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

  // 按信息源分组排序：中文源在前，英文源在后，保持 sources.json 顺序
  // 每个源内部按发布时间降序
  const allNews = (() => {
    // 先按语言和源顺序分组（API 已按 sources.json 顺序返回）
    const zhSources = sources.filter(s => s.language === 'zh');
    const enSources = sources.filter(s => s.language === 'en');
    const orderedSources = [...zhSources, ...enSources];

    // 展开所有新闻，保持分组顺序，组内按时间排序
    return orderedSources.flatMap(source => {
      const items = (source.items || []).map(item => ({
        ...item,
        sourceName: source.name,
        sourceId: source.id,
        sourceLanguage: source.language
      }));
      // 组内按发布时间降序
      return items.sort((a, b) => {
        const dateA = new Date(a.pubDate || 0);
        const dateB = new Date(b.pubDate || 0);
        return dateB - dateA;
      });
    });
  })();

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
              {/* Headlines Summary (Collapsible) */}
              <div className={`lab-headlines-summary ${isSummaryExpanded ? 'expanded' : 'collapsed'}`}>
                <div
                  className="lab-summary-header"
                  onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                >
                  <span className="lab-summary-icon-container">
                    {isSummaryExpanded ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                      </svg>
                    )}
                  </span>
                  <span className="lab-summary-title-text">
                    {language === 'zh' ? '内容目录' : 'Contents'}
                  </span>
                  <span className="lab-summary-count">
                    ({allNews.length})
                  </span>
                </div>

                {isSummaryExpanded && (
                  <div className="lab-headlines-list-container">
                    <div className="lab-headlines-list">
                      {allNews.map((item, index) => (
                        <button
                          key={item.id}
                          className="lab-headline-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            // 先收起目录
                            setIsSummaryExpanded(false);

                            // 等待 DOM 更新后再计算滚动位置
                            setTimeout(() => {
                              const element = document.getElementById(`news-${item.id}`);
                              if (element) {
                                const headerOffset = 80;
                                const elementPosition = element.getBoundingClientRect().top;
                                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                                window.scrollTo({
                                  top: offsetPosition,
                                  behavior: 'smooth'
                                });

                                element.classList.add('highlight-card');
                                setTimeout(() => element.classList.remove('highlight-card'), 2000);
                              }
                            }, 100); // 等待 100ms 让目录收起动画完成
                          }}
                        >
                          <span className="headline-index">{String(index + 1).padStart(2, '0')}</span>
                          <span className="headline-text">{item.originalTitle}</span>
                        </button>
                      ))}
                    </div>
                    <div className="lab-summary-footer">
                      <button
                        className="lab-summary-collapse-btn"
                        onClick={() => setIsSummaryExpanded(false)}
                      >
                        {language === 'zh' ? '收起' : 'Collapse'} ▲
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="news-list">
                {allNews.map((item, index) => (
                  <div key={item.id} id={`news-${item.id}`}>
                    <NewsCardLab
                      item={item}
                      sourceName={item.sourceName}
                      language={language}
                      index={index}
                    />
                  </div>
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
        language={language}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
