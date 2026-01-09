/**
 * 存储抽象层
 * 本地开发使用文件系统，云端部署使用 Cloudflare R2
 * 
 * 环境检测：
 * - 本地开发：使用 fs 读写 data/ 目录
 * - 云端部署：使用 Cloudflare R2 (S3 兼容 API)
 */

import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

const DATA_DIR = path.join(process.cwd(), 'data');

// R2 客户端（懒加载）
let r2Client = null;

/**
 * 获取 R2 客户端实例
 */
function getR2Client() {
    if (!r2Client) {
        r2Client = new S3Client({
            region: 'auto',
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            },
        });
    }
    return r2Client;
}

/**
 * 检测是否使用云端存储
 */
function isCloudEnvironment() {
    return process.env.VERCEL === '1' || process.env.R2_ACCESS_KEY_ID;
}

/**
 * 获取 R2 存储路径（Key）
 * 对路径进行编码，处理中文文件名
 */
function getR2Key(relativePath) {
    // 保持斜杠不被编码，但编码其他特殊字符
    const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/');
    return `news-capsule/${encodedPath}`;
}

/**
 * 读取 JSON 数据
 */
export async function readJSON(relativePath) {
    if (isCloudEnvironment()) {
        const fromR2 = await readJSONFromR2(relativePath);
        if (fromR2 !== null) {
            console.log(`[Storage] Read from R2: ${relativePath}`);
            return fromR2;
        }
        console.log(`[Storage] R2 miss, reading from file: ${relativePath}`);
        return readJSONFromFile(relativePath);
    }
    return readJSONFromFile(relativePath);
}

/**
 * 写入 JSON 数据
 */
export async function writeJSON(relativePath, data) {
    console.log(`[Storage] Writing to ${relativePath}, isCloud=${isCloudEnvironment()}`);
    if (isCloudEnvironment()) {
        return writeJSONToR2(relativePath, data);
    }
    return writeJSONToFile(relativePath, data);
}

/**
 * 删除数据
 */
export async function deleteData(relativePath) {
    console.log(`[Storage] Deleting ${relativePath}`);
    if (isCloudEnvironment()) {
        return deleteFromR2(relativePath);
    }
    return deleteFromFile(relativePath);
}

/**
 * 列出目录下的文件
 * 策略：云端环境下，合并 R2 和本地文件系统的文件列表（并去重）
 */
export async function listFiles(relativePath) {
    if (isCloudEnvironment()) {
        const [r2Files, localFiles] = await Promise.all([
            listFilesFromR2(relativePath),
            listFilesFromDir(relativePath)
        ]);
        return Array.from(new Set([...r2Files, ...localFiles]));
    }
    return listFilesFromDir(relativePath);
}

/**
 * 检查文件是否存在
 * 策略：云端环境下，只要 R2 或本地文件系统任一存在即返回 true
 */
export async function exists(relativePath) {
    if (isCloudEnvironment()) {
        const inR2 = await existsInR2(relativePath);
        if (inR2) return true;
        return existsInFile(relativePath);
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

// ==================== Cloudflare R2 实现 ====================

async function readJSONFromR2(relativePath) {
    try {
        const key = getR2Key(relativePath);
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });

        const response = await getR2Client().send(command);
        const bodyString = await response.Body.transformToString();
        return JSON.parse(bodyString);
    } catch (error) {
        // NoSuchKey 表示文件不存在
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
            return null;
        }
        console.error(`Error reading from R2 ${relativePath}:`, error);
        return null;
    }
}

async function writeJSONToR2(relativePath, data) {
    try {
        const key = getR2Key(relativePath);
        const content = JSON.stringify(data, null, 2);

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: content,
            ContentType: 'application/json',
        });

        await getR2Client().send(command);
    } catch (error) {
        console.error(`Error writing to R2 ${relativePath}:`, error);
        throw error;
    }
}

async function deleteFromR2(relativePath) {
    try {
        const key = getR2Key(relativePath);
        const command = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });

        await getR2Client().send(command);
    } catch (error) {
        // 删除不存在的文件不报错
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
            return;
        }
        console.error(`Error deleting from R2 ${relativePath}:`, error);
    }
}

async function listFilesFromR2(relativePath) {
    try {
        const prefix = getR2Key(relativePath);
        const command = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: prefix.endsWith('/') ? prefix : prefix + '/',
        });

        const response = await getR2Client().send(command);
        const contents = response.Contents || [];

        // 只返回直接子文件，不包含子目录中的文件
        const prefixLength = (prefix.endsWith('/') ? prefix : prefix + '/').length;
        const files = new Set();

        for (const item of contents) {
            const rest = item.Key.slice(prefixLength);
            // 只取第一层
            const firstPart = rest.split('/')[0];
            if (firstPart) {
                // 解码文件名
                try {
                    files.add(decodeURIComponent(firstPart));
                } catch (e) {
                    files.add(firstPart);
                }
            }
        }

        return Array.from(files);
    } catch (error) {
        console.error(`Error listing from R2 ${relativePath}:`, error);
        return [];
    }
}

async function existsInR2(relativePath) {
    try {
        const key = getR2Key(relativePath);
        const command = new HeadObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });

        await getR2Client().send(command);
        return true;
    } catch (error) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            return false;
        }
        console.error(`Error checking existence in R2 ${relativePath}:`, error);
        return false;
    }
}

// ==================== 便捷函数 ====================

/**
 * 读取 settings.json
 * @returns {Promise<object>}
 */
export async function readSettings() {
    const data = await readJSON('settings.json');
    return data || {};
}

/**
 * 写入 settings.json
 * @param {object} settings - 要写入的设置对象
 * @returns {Promise<void>}
 */
export async function writeSettings(settings) {
    await writeJSON('settings.json', settings);
}
