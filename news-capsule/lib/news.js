/**
 * 新闻数据读取模块
 * 使用存储抽象层，支持本地文件和 Vercel Blob
 */

import { readJSON, listFiles } from './storage.js';

/**
 * 获取指定日期的新闻数据
 * @param {string} date - 日期字符串，格式：YYYY-MM-DD
 * @returns {Promise<object|null>} 新闻数据对象或null
 */
export async function getNewsByDate(date) {
    try {
        const data = await readJSON(`news/${date}.json`);
        return data;
    } catch (error) {
        console.error(`Error reading news for ${date}:`, error);
        return null;
    }
}

/** 
 * 获取今日新闻
 * @returns {Promise<object|null>} 今日新闻数据
 */
export async function getTodayNews() {
    const today = new Date().toISOString().split('T')[0];
    return getNewsByDate(today);
}

/**
 * 获取最新的新闻（按日期倒序查找）
 * @returns {Promise<object|null>} 最新新闻数据
 */
export async function getLatestNews() {
    try {
        const files = await listFiles('news');
        const jsonFiles = files
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => b.localeCompare(a)); // 倒序

        if (jsonFiles.length > 0) {
            const latestFile = jsonFiles[0];
            const date = latestFile.replace('.json', '');
            return getNewsByDate(date);
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
