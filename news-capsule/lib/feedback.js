/**
 * 用户反馈模块
 * 使用存储抽象层，支持本地文件和 Vercel Blob
 */

import { readJSON, writeJSON } from './storage.js';

const FEEDBACK_PATH = 'feedback.json';

export async function getFeedback() {
    const data = await readJSON(FEEDBACK_PATH);
    return data || [];
}

export async function saveFeedback(entry) {
    const currentFeedback = await getFeedback();

    const newEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...entry
    };

    currentFeedback.unshift(newEntry); // Add new entry to the top

    await writeJSON(FEEDBACK_PATH, currentFeedback);
    return newEntry;
}
