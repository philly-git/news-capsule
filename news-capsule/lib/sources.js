/**
 * RSS 源管理模块
 * 统一管理所有 RSS 源的增删改查
 * 使用存储抽象层，支持本地文件和 Vercel Blob
 */

import { readJSON, writeJSON } from './storage.js';

const SOURCES_PATH = 'sources.json';

/**
 * 读取源配置文件
 */
async function readSourcesFile() {
    const data = await readJSON(SOURCES_PATH);
    return data || { version: 1, updatedAt: null, sources: [] };
}

/**
 * 写入源配置文件
 */
async function writeSourcesFile(data) {
    data.updatedAt = new Date().toISOString();
    await writeJSON(SOURCES_PATH, data);
}

/**
 * 生成唯一 ID
 */
function generateId(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * 获取所有源
 */
export async function getAllSources() {
    const data = await readSourcesFile();
    return data.sources;
}

/**
 * 获取启用的源（可选按语言筛选）
 */
export async function getEnabledSources(language = null) {
    const sources = (await getAllSources()).filter(s => s.enabled);
    if (language) {
        return sources.filter(s => s.language === language);
    }
    return sources;
}

/**
 * 获取按分类分组的源
 */
export async function getSourcesByCategory() {
    const sources = await getAllSources();
    const grouped = {};
    for (const source of sources) {
        const category = source.category || 'other';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(source);
    }
    return grouped;
}

/**
 * 根据 ID 获取单个源
 */
export async function getSourceById(id) {
    const sources = await getAllSources();
    return sources.find(s => s.id === id) || null;
}

/**
 * 添加新源
 */
export async function addSource({ name, url, language, category }) {
    const data = await readSourcesFile();

    // 检查 URL 是否已存在
    if (data.sources.some(s => s.url === url)) {
        throw new Error('该链接已存在');
    }

    const newSource = {
        id: generateId(name),
        name,
        url,
        language: language || 'zh',
        category: category || 'tech',
        enabled: true,
        addedAt: new Date().toISOString()
    };

    // 确保 ID 唯一
    let baseId = newSource.id;
    let counter = 1;
    while (data.sources.some(s => s.id === newSource.id)) {
        newSource.id = `${baseId}-${counter}`;
        counter++;
    }

    data.sources.push(newSource);
    await writeSourcesFile(data);

    return newSource;
}

/**
 * 更新源
 */
export async function updateSource(id, updates) {
    const data = await readSourcesFile();
    const index = data.sources.findIndex(s => s.id === id);

    if (index === -1) {
        throw new Error('源不存在');
    }

    // 只允许更新特定字段
    const allowedFields = ['name', 'url', 'language', 'category', 'enabled'];
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            data.sources[index][field] = updates[field];
        }
    }

    await writeSourcesFile(data);
    return data.sources[index];
}

/**
 * 删除源
 */
export async function deleteSource(id) {
    const data = await readSourcesFile();
    const index = data.sources.findIndex(s => s.id === id);

    if (index === -1) {
        throw new Error('源不存在');
    }

    const deleted = data.sources.splice(index, 1)[0];
    await writeSourcesFile(data);

    return deleted;
}

/**
 * 启用/禁用源
 */
export async function toggleSource(id) {
    const data = await readSourcesFile();
    const source = data.sources.find(s => s.id === id);

    if (!source) {
        throw new Error('源不存在');
    }

    source.enabled = !source.enabled;
    await writeSourcesFile(data);

    return source;
}
