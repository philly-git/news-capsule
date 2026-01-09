/**
 * 按信息源存储的 Feed 管理模块
 * 每个源独立存储，保留 14 天历史
 * 使用存储抽象层，支持本地文件和 Vercel Blob
 */

import crypto from 'crypto';
import { readJSON, writeJSON, listFiles } from './storage.js';

const RETENTION_DAYS = 14;

/**
 * 生成条目唯一 ID（基于 URL）
 */
function generateItemId(url) {
    return crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
}

/**
 * 获取源的 items.json 路径
 */
function getItemsPath(sourceId) {
    return `feeds/${sourceId}/items.json`;
}

/**
 * 读取源的所有条目
 */
export async function getSourceItems(sourceId) {
    const data = await readJSON(getItemsPath(sourceId));
    return data || { sourceId, items: [], lastSync: null, totalItems: 0 };
}

/**
 * 保存源的条目
 */
export async function saveSourceItems(sourceId, data) {
    await writeJSON(getItemsPath(sourceId), data);
}

/**
 * 清理过期条目（超过 14 天且状态为 archived）
 */
function cleanExpiredItems(items) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    return items.filter(item => {
        // 只清理 archived 状态的过期条目
        if (item.status === 'archived') {
            const syncDate = new Date(item.syncedAt || item.pubDate);
            return syncDate >= cutoff;
        }
        // 其他状态保留
        return true;
    });
}

/**
 * 添加新抓取的条目到源
 * 基于 URL 去重，只保留最新版本
 */
export async function addItemsToSource(sourceId, newItems) {
    const data = await getSourceItems(sourceId);
    const existingMap = new Map(data.items.map(item => [item.id, item]));

    let addedCount = 0;
    let updatedCount = 0;

    for (const item of newItems) {
        const id = generateItemId(item.link);
        const existingItem = existingMap.get(id);

        if (existingItem) {
            // 更新现有条目（保留状态）
            existingMap.set(id, {
                ...item,
                id,
                status: existingItem.status, // 保留原状态
                syncedAt: new Date().toISOString()
            });
            updatedCount++;
        } else {
            // 添加新条目
            existingMap.set(id, {
                ...item,
                id,
                status: 'new',
                syncedAt: new Date().toISOString()
            });
            addedCount++;
        }
    }

    // 转回数组并清理过期
    let allItems = Array.from(existingMap.values());
    allItems = cleanExpiredItems(allItems);

    // 按发布时间降序排列
    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // 保存
    data.items = allItems;
    data.lastSync = new Date().toISOString();
    data.totalItems = allItems.length;

    await saveSourceItems(sourceId, data);

    return { addedCount, updatedCount, totalItems: allItems.length };
}

/**
 * 更新条目状态
 */
export async function updateItemStatus(sourceId, itemId, status) {
    const data = await getSourceItems(sourceId);
    const item = data.items.find(i => i.id === itemId);

    if (!item) {
        throw new Error('条目不存在');
    }

    item.status = status;
    await saveSourceItems(sourceId, data);

    return item;
}

/**
 * 批量更新条目状态
 */
export async function batchUpdateItemStatus(sourceId, itemIds, status) {
    const data = await getSourceItems(sourceId);
    let updatedCount = 0;

    for (const itemId of itemIds) {
        const item = data.items.find(i => i.id === itemId);
        if (item) {
            item.status = status;
            updatedCount++;
        }
    }

    await saveSourceItems(sourceId, data);
    return { updatedCount };
}

/**
 * 获取所有源目录
 */
async function getAllSourceDirs() {
    const files = await listFiles('feeds');
    // 只返回目录（排除非目录文件）
    return files.filter(f => !f.includes('.'));
}

/**
 * 获取所有源的统计信息
 */
export async function getAllFeedsStats() {
    const stats = {};
    const dirs = await getAllSourceDirs();

    for (const sourceId of dirs) {
        const data = await getSourceItems(sourceId);
        const newCount = data.items.filter(i => i.status === 'new').length;
        const pendingCount = data.items.filter(i => i.status === 'pending').length;
        const queuedCount = data.items.filter(i => i.status === 'queued').length;
        const publishedCount = data.items.filter(i => i.status === 'published').length;
        const archivedCount = data.items.filter(i => i.status === 'archived').length;

        stats[sourceId] = {
            totalItems: data.totalItems,
            newCount,
            pendingCount,
            queuedCount,
            publishedCount,
            archivedCount,
            lastSync: data.lastSync
        };
    }

    return stats;
}

/**
 * 将所有源的 new 状态转为 pending（刷新前调用）
 */
export async function convertNewToPending() {
    const dirs = await getAllSourceDirs();
    let totalConverted = 0;

    for (const sourceId of dirs) {
        const data = await getSourceItems(sourceId);
        let converted = 0;

        for (const item of data.items) {
            if (item.status === 'new') {
                item.status = 'pending';
                converted++;
            }
        }

        if (converted > 0) {
            await saveSourceItems(sourceId, data);
            totalConverted += converted;
        }
    }

    return { totalConverted };
}

/**
 * 将单个源的 new 状态转为 pending
 */
export async function convertSourceNewToPending(sourceId) {
    const data = await getSourceItems(sourceId);
    let converted = 0;

    for (const item of data.items) {
        if (item.status === 'new') {
            item.status = 'pending';
            converted++;
        }
    }

    if (converted > 0) {
        await saveSourceItems(sourceId, data);
    }

    return { converted };
}

/**
 * 获取所有状态为 "new" 的条目（跨所有源）
 */
export async function getAllNewItems() {
    const allNewItems = [];
    const dirs = await getAllSourceDirs();

    for (const sourceId of dirs) {
        const data = await getSourceItems(sourceId);
        const newItems = data.items
            .filter(i => i.status === 'new')
            .map(i => ({ ...i, sourceId }));
        allNewItems.push(...newItems);
    }

    // 按发布时间降序
    allNewItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    return allNewItems;
}

/**
 * 获取所有状态为 "queued" 的条目（待出版，跨所有源）
 */
export async function getAllQueuedItems() {
    const queuedItems = [];
    const dirs = await getAllSourceDirs();

    for (const sourceId of dirs) {
        const data = await getSourceItems(sourceId);
        const items = data.items
            .filter(i => i.status === 'queued')
            .map(i => ({ ...i, sourceId }));
        queuedItems.push(...items);
    }

    // 按发布时间降序
    queuedItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    return queuedItems;
}

/**
 * 批量更新条目状态（跨所有源）
 */
export async function batchUpdateItemsStatus(itemIds, newStatus) {
    const dirs = await getAllSourceDirs();
    let totalUpdated = 0;
    const itemIdSet = new Set(itemIds);
    const now = new Date().toISOString();

    for (const sourceId of dirs) {
        const data = await getSourceItems(sourceId);
        let updated = 0;

        for (const item of data.items) {
            if (itemIdSet.has(item.id)) {
                item.status = newStatus;
                if (newStatus === 'published') {
                    item.publishedAt = now;
                }
                updated++;
            }
        }

        if (updated > 0) {
            await saveSourceItems(sourceId, data);
            totalUpdated += updated;
        }
    }

    return { totalUpdated };
}
