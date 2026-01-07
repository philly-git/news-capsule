/**
 * RSS 源管理模块
 * 统一管理所有 RSS 源的增删改查
 */

import fs from 'fs';
import path from 'path';

const SOURCES_FILE = path.join(process.cwd(), 'data', 'sources.json');

/**
 * 读取源配置文件
 */
function readSourcesFile() {
    if (!fs.existsSync(SOURCES_FILE)) {
        return { version: 1, updatedAt: null, sources: [] };
    }
    try {
        return JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'));
    } catch (e) {
        console.error('Failed to read sources.json:', e);
        return { version: 1, updatedAt: null, sources: [] };
    }
}

/**
 * 写入源配置文件
 */
function writeSourcesFile(data) {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(SOURCES_FILE, JSON.stringify(data, null, 2));
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
export function getAllSources() {
    const data = readSourcesFile();
    return data.sources;
}

/**
 * 获取启用的源（可选按语言筛选）
 */
export function getEnabledSources(language = null) {
    const sources = getAllSources().filter(s => s.enabled);
    if (language) {
        return sources.filter(s => s.language === language);
    }
    return sources;
}

/**
 * 获取按分类分组的源
 */
export function getSourcesByCategory() {
    const sources = getAllSources();
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
export function getSourceById(id) {
    return getAllSources().find(s => s.id === id) || null;
}

/**
 * 添加新源
 */
export function addSource({ name, url, language, category }) {
    const data = readSourcesFile();

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
    writeSourcesFile(data);

    return newSource;
}

/**
 * 更新源
 */
export function updateSource(id, updates) {
    const data = readSourcesFile();
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

    writeSourcesFile(data);
    return data.sources[index];
}

/**
 * 删除源
 */
export function deleteSource(id) {
    const data = readSourcesFile();
    const index = data.sources.findIndex(s => s.id === id);

    if (index === -1) {
        throw new Error('源不存在');
    }

    const deleted = data.sources.splice(index, 1)[0];
    writeSourcesFile(data);

    return deleted;
}

/**
 * 启用/禁用源
 */
export function toggleSource(id) {
    const data = readSourcesFile();
    const source = data.sources.find(s => s.id === id);

    if (!source) {
        throw new Error('源不存在');
    }

    source.enabled = !source.enabled;
    writeSourcesFile(data);

    return source;
}
