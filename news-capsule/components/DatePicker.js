'use client';

import { useState, useEffect, useRef } from 'react';

export default function DatePicker({
    selectedDate,
    onDateChange,
    language = 'zh',
    availableDates = []
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 格式化日期显示
    const formatDateDisplay = (dateStr, lang) => {
        if (!dateStr) return lang === 'zh' ? '选择日期' : 'Select date';

        const date = new Date(dateStr);

        if (lang === 'en') {
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        }

        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}月${day}日`;
    };

    // 格式化下拉选项
    const formatOptionDate = (dateStr, lang) => {
        const date = new Date(dateStr);
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        let prefix = '';
        if (dateStr === today) {
            prefix = lang === 'zh' ? '今天 · ' : 'Today · ';
        } else if (dateStr === yesterday) {
            prefix = lang === 'zh' ? '昨天 · ' : 'Yesterday · ';
        }

        if (lang === 'en') {
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            return prefix + date.toLocaleDateString('en-US', options);
        }

        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekDay = weekDays[date.getDay()];
        return `${prefix}${month}月${day}日 周${weekDay}`;
    };

    const t = {
        label: language === 'zh' ? '历史新闻' : 'Archives',
        noData: language === 'zh' ? '暂无历史数据' : 'No archives available',
    };

    return (
        <div className="date-picker" ref={dropdownRef}>
            <button
                className="date-picker-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span className="date-picker-icon">📅</span>
                <span className="date-picker-label">{formatDateDisplay(selectedDate, language)}</span>
                <span className="date-picker-arrow">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
                <div className="date-picker-dropdown">
                    <div className="date-picker-header">{t.label}</div>
                    {availableDates.length === 0 ? (
                        <div className="date-picker-empty">{t.noData}</div>
                    ) : (
                        <ul className="date-picker-list">
                            {availableDates.map((date) => (
                                <li key={date}>
                                    <button
                                        className={`date-picker-option ${date === selectedDate ? 'active' : ''}`}
                                        onClick={() => {
                                            onDateChange(date);
                                            setIsOpen(false);
                                        }}
                                    >
                                        {formatOptionDate(date, language)}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
