/**
 * 数据迁移脚本：将现有条目状态迁移到新的状态系统
 * 
 * 状态映射：
 * - new → new (保持不变)
 * - selected → pending (等待重新处理)
 * - summarized → published
 * 
 * 运行方式：node scripts/migrate-status.js
 */

import fs from 'fs';
import path from 'path';

const FEEDS_DIR = path.join(process.cwd(), 'data', 'feeds');

function migrateStatus() {
    console.log('开始迁移状态...\n');

    if (!fs.existsSync(FEEDS_DIR)) {
        console.log('feeds 目录不存在，无需迁移');
        return;
    }

    const dirs = fs.readdirSync(FEEDS_DIR).filter(d =>
        fs.statSync(path.join(FEEDS_DIR, d)).isDirectory()
    );

    let totalMigrated = 0;

    for (const sourceId of dirs) {
        const itemsPath = path.join(FEEDS_DIR, sourceId, 'items.json');

        if (!fs.existsSync(itemsPath)) {
            continue;
        }

        try {
            const data = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));
            let migrated = 0;

            for (const item of data.items) {
                if (item.status === 'selected') {
                    item.status = 'pending';
                    migrated++;
                } else if (item.status === 'summarized') {
                    item.status = 'published';
                    migrated++;
                }
            }

            if (migrated > 0) {
                fs.writeFileSync(itemsPath, JSON.stringify(data, null, 2));
                console.log(`  ✓ ${sourceId}: 迁移了 ${migrated} 条`);
                totalMigrated += migrated;
            }
        } catch (e) {
            console.error(`  ✗ ${sourceId}: 迁移失败 - ${e.message}`);
        }
    }

    console.log(`\n迁移完成！共迁移 ${totalMigrated} 条记录`);
}

migrateStatus();
