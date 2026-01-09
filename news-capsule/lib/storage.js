/**
 * 存储抽象层
 * 本地开发使用文件系统，Vercel 部署使用 Blob 存储
 * 
 * 环境检测：
 * - 本地开发：使用 fs 读写 data/ 目录
 * - Vercel 部署：使用 @vercel/blob
 */

import fs from 'fs';
import path from 'path';
import { put, list, del } from '@vercel/blob';

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * 检测是否在 Vercel 环境运行
 */
function isVercelEnvironment() {
    return process.env.VERCEL === '1' || process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * 获取 Blob 存储路径前缀
 */
function getBlobPath(relativePath) {
    return `news-capsule/${relativePath}`;
}

/**
 * 读取 JSON 数据
 * @param {string} relativePath - 相对于 data/ 的路径，如 'sources.json' 或 'feeds/36kr/items.json'
 * @returns {Promise<object|null>}
 */
export async function readJSON(relativePath) {
    if (isVercelEnvironment()) {
        return readJSONFromBlob(relativePath);
    }
    return readJSONFromFile(relativePath);
}

/**
 * 写入 JSON 数据
 * @param {string} relativePath - 相对于 data/ 的路径
 * @param {object} data - 要写入的数据
 * @returns {Promise<void>}
 */
export async function writeJSON(relativePath, data) {
    if (isVercelEnvironment()) {
        return writeJSONToBlob(relativePath, data);
    }
    return writeJSONToFile(relativePath, data);
}

/**
 * 删除数据
 * @param {string} relativePath - 相对于 data/ 的路径
 * @returns {Promise<void>}
 */
export async function deleteData(relativePath) {
    if (isVercelEnvironment()) {
        return deleteFromBlob(relativePath);
    }
    return deleteFromFile(relativePath);
}

/**
 * 列出目录下的文件
 * @param {string} relativePath - 相对于 data/ 的目录路径
 * @returns {Promise<string[]>} 文件名列表
 */
export async function listFiles(relativePath) {
    if (isVercelEnvironment()) {
        return listFilesFromBlob(relativePath);
    }
    return listFilesFromDir(relativePath);
}

/**
 * 检查文件是否存在
 * @param {string} relativePath - 相对于 data/ 的路径
 * @returns {Promise<boolean>}
 */
export async function exists(relativePath) {
    if (isVercelEnvironment()) {
        return existsInBlob(relativePath);
    }
    return existsInFile(relativePath);
}

// ==================== 文件系统实现 ====================

function readJSONFromFile(relativePath) {
    const filePath = path.join(DATA_DIR, relativePath);
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        }
        return null;
    } catch (error) {
        console.error(`Error reading ${relativePath}:`, error);
        return null;
    }
}

function writeJSONToFile(relativePath, data) {
    const filePath = path.join(DATA_DIR, relativePath);
    const dir = path.dirname(filePath);

    // 确保目录存在
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function deleteFromFile(relativePath) {
    const filePath = path.join(DATA_DIR, relativePath);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error(`Error deleting ${relativePath}:`, error);
    }
}

function listFilesFromDir(relativePath) {
    const dirPath = path.join(DATA_DIR, relativePath);
    try {
        if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
            return fs.readdirSync(dirPath);
        }
        return [];
    } catch (error) {
        console.error(`Error listing ${relativePath}:`, error);
        return [];
    }
}

function existsInFile(relativePath) {
    const filePath = path.join(DATA_DIR, relativePath);
    return fs.existsSync(filePath);
}

// ==================== Vercel Blob 实现 ====================

async function readJSONFromBlob(relativePath) {
    try {
        const blobPath = getBlobPath(relativePath);
        const { blobs } = await list({ prefix: blobPath });

        if (blobs.length === 0) {
            return null;
        }

        // 找到精确匹配的文件
        const blob = blobs.find(b => b.pathname === blobPath);
        if (!blob) {
            return null;
        }

        const response = await fetch(blob.url);
        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`Error reading from blob ${relativePath}:`, error);
        return null;
    }
}

async function writeJSONToBlob(relativePath, data) {
    try {
        const blobPath = getBlobPath(relativePath);
        const content = JSON.stringify(data, null, 2);

        await put(blobPath, content, {
            access: 'public',
            contentType: 'application/json',
            addRandomSuffix: false,
        });
    } catch (error) {
        console.error(`Error writing to blob ${relativePath}:`, error);
        throw error;
    }
}

async function deleteFromBlob(relativePath) {
    try {
        const blobPath = getBlobPath(relativePath);
        const { blobs } = await list({ prefix: blobPath });

        const blob = blobs.find(b => b.pathname === blobPath);
        if (blob) {
            await del(blob.url);
        }
    } catch (error) {
        console.error(`Error deleting from blob ${relativePath}:`, error);
    }
}

async function listFilesFromBlob(relativePath) {
    try {
        const prefix = getBlobPath(relativePath);
        const { blobs } = await list({ prefix });

        // 只返回直接子文件，不包含子目录中的文件
        const prefixLength = prefix.length;
        const files = new Set();

        for (const blob of blobs) {
            const rest = blob.pathname.slice(prefixLength);
            // 移除开头的斜杠
            const cleanPath = rest.startsWith('/') ? rest.slice(1) : rest;
            // 只取第一层
            const firstPart = cleanPath.split('/')[0];
            if (firstPart) {
                files.add(firstPart);
            }
        }

        return Array.from(files);
    } catch (error) {
        console.error(`Error listing from blob ${relativePath}:`, error);
        return [];
    }
}

async function existsInBlob(relativePath) {
    try {
        const blobPath = getBlobPath(relativePath);
        const { blobs } = await list({ prefix: blobPath });
        return blobs.some(b => b.pathname === blobPath);
    } catch (error) {
        console.error(`Error checking existence in blob ${relativePath}:`, error);
        return false;
    }
}
