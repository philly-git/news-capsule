import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'news');

/**
 * 获取指定日期的新闻数据
 * @param {string} date - 日期字符串，格式：YYYY-MM-DD
 * @returns {object|null} 新闻数据对象或null
 */
export function getNewsByDate(date) {
    const filePath = path.join(DATA_DIR, `${date}.json`);

    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        }
        return null;
    } catch (error) {
        console.error(`Error reading news for ${date}:`, error);
        return null;
    }
}

/**
 * 获取今日新闻
 * @returns {object|null} 今日新闻数据
 */
export function getTodayNews() {
    const today = new Date().toISOString().split('T')[0];
    return getNewsByDate(today);
}

/**
 * 获取最新的新闻（按日期倒序查找）
 * @returns {object|null} 最新新闻数据
 */
export function getLatestNews() {
    try {
        const files = fs.readdirSync(DATA_DIR)
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => b.localeCompare(a)); // 倒序

        if (files.length > 0) {
            const latestFile = files[0];
            const content = fs.readFileSync(path.join(DATA_DIR, latestFile), 'utf-8');
            return JSON.parse(content);
        }
        return null;
    } catch (error) {
        console.error('Error getting latest news:', error);
        return null;
    }
}

/**
 * 格式化日期为中文显示
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化后的日期
 */
export function formatDateChinese(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[date.getDay()];

    return `${year}年${month}月${day}日 · 星期${weekDay}`;
}
