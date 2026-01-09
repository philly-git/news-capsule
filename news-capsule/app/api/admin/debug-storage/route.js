import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

// 获取 R2 客户端
function getR2Client() {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });
}

export async function GET() {
    const debugInfo = {
        env: {
            VERCEL: process.env.VERCEL,
            NODE_ENV: process.env.NODE_ENV,
            HAS_R2_CREDENTIALS: !!(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY),
            CWD: process.cwd(),
        },
        fs: {
            dataDirExists: false,
            dataDirContents: [],
            settingsExists: false,
            feedsDirExists: false,
            feedsContents: []
        },
        r2: {
            status: 'unknown',
            files: [],
            error: null
        }
    };

    try {
        // 检查文件系统
        const dataPath = path.join(process.cwd(), 'data');
        debugInfo.fs.dataDirExists = fs.existsSync(dataPath);

        if (debugInfo.fs.dataDirExists) {
            try {
                debugInfo.fs.dataDirContents = fs.readdirSync(dataPath);
            } catch (e) {
                debugInfo.fs.dataDirContents = `Error: ${e.message}`;
            }
        }

        const settingsPath = path.join(dataPath, 'settings.json');
        debugInfo.fs.settingsExists = fs.existsSync(settingsPath);

        const feedsPath = path.join(dataPath, 'feeds');
        debugInfo.fs.feedsDirExists = fs.existsSync(feedsPath);
        if (debugInfo.fs.feedsDirExists) {
            try {
                debugInfo.fs.feedsContents = fs.readdirSync(feedsPath);
            } catch (e) {
                debugInfo.fs.feedsContents = `Error: ${e.message}`;
            }
        }

        // 检查 R2
        if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
            try {
                const command = new ListObjectsV2Command({
                    Bucket: process.env.R2_BUCKET_NAME,
                    MaxKeys: 10,
                });
                const response = await getR2Client().send(command);
                debugInfo.r2.status = 'connected';
                debugInfo.r2.files = (response.Contents || []).map(item => item.Key);
            } catch (e) {
                debugInfo.r2.status = 'error';
                debugInfo.r2.error = e.message;
            }
        } else {
            debugInfo.r2.status = 'no_credentials';
        }

    } catch (error) {
        debugInfo.globalError = error.message;
    }

    return NextResponse.json(debugInfo);
}
