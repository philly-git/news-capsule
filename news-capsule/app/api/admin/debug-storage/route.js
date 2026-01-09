import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { list } from '@vercel/blob';

export const dynamic = 'force-dynamic';

export async function GET() {
    const debugInfo = {
        env: {
            VERCEL: process.env.VERCEL,
            NODE_ENV: process.env.NODE_ENV,
            HAS_BLOB_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
            CWD: process.cwd(),
        },
        fs: {
            dataDirExists: false,
            dataDirContents: [],
            settingsExists: false,
            feedsDirExists: false,
            feedsContents: []
        },
        blob: {
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

        // 检查 Blob
        if (process.env.BLOB_READ_WRITE_TOKEN) {
            try {
                const { blobs } = await list({ limit: 10 });
                debugInfo.blob.status = 'connected';
                debugInfo.blob.files = blobs.map(b => b.pathname);
            } catch (e) {
                debugInfo.blob.status = 'error';
                debugInfo.blob.error = e.message;
            }
        } else {
            debugInfo.blob.status = 'no_token';
        }

    } catch (error) {
        debugInfo.globalError = error.message;
    }

    return NextResponse.json(debugInfo);
}
