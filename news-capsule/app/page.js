'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import SourceGroup from '@/components/SourceGroup';
import SubscribeModal from '@/components/SubscribeModal';
import Footer from '@/components/Footer';
import DatePicker from '@/components/DatePicker';

export default function Home() {
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

  // 获取新闻数据（按源分组）
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

  // 初始加载
  useEffect(() => {
    fetchAvailableDates(language);
  }, []);

  // 语言切换时重新获取
  useEffect(() => {
    fetchAvailableDates(language);
    fetchFeeds(language, selectedDate);
  }, [language]);

  // 日期切换时重新获取
  useEffect(() => {
    if (selectedDate) {
      fetchFeeds(language, selectedDate);
    }
  }, [selectedDate]);

  // 获取订阅人数
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
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[date.getDay()];
    return `${year}年${month}月${day}日 · 星期${weekDay}`;
  };

  // 切换语言
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  // 切换日期
  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const sources = feedsData?.sources || [];
  const date = feedsData?.date || selectedDate || new Date().toISOString().split('T')[0];

  // 计算总条目数
  const totalItems = sources.reduce((acc, src) => acc + (src.items?.length || 0), 0);

  // 文案翻译
  const t = {
    newsCount: language === 'zh' ? '条资讯' : 'articles',
    doneMessage: language === 'zh' ? '更新完毕' : "That's all",
    loading: language === 'zh' ? '加载中...' : 'Loading...',
    noNews: language === 'zh' ? '暂无新闻' : 'No news available',
  };

  return (
    <>
      <Header
        onSubscribeClick={() => setIsModalOpen(true)}
        language={language}
        onLanguageToggle={toggleLanguage}
      />

      <main className="container">
        {/* 日期头 + 日期选择器 */}
        <div className="date-header-row">
          <div className="date-header-left">
            📅 {formatDate(date, language)} · <span>{totalItems}</span> {t.newsCount}
          </div>
          <DatePicker
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            language={language}
            availableDates={availableDates}
          />
        </div>

        {/* 按源分组的新闻列表 */}
        {loading ? (
          <div className="loading-state">
            <p>{t.loading}</p>
          </div>
        ) : sources.length === 0 ? (
          <div className="empty-state">
            <p>{t.noNews}</p>
          </div>
        ) : (
          <>
            <div className="sources-list">
              {sources.map((source, index) => (
                <SourceGroup
                  key={source.id}
                  source={source}
                  items={source.items || []}
                  language={language}
                  defaultExpanded={index === 0}
                />
              ))}
            </div>

            {/* 完成状态 */}
            <div className="footer-status">
              <span className="footer-status-icon">✅</span>
              {t.doneMessage}
            </div>
          </>
        )}
      </main>

      <Footer language={language} />

      <SubscribeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        subscriberCount={subscriberCount}
        language={language}
      />
    </>
  );
}
