/**
 * 修复已保存数据中的 HTML 实体
 * 运行方式: node scripts/fix-html-entities.js
 */

const fs = require('fs');
const path = require('path');

// HTML 实体解码函数
function decodeHtmlEntities(text) {
    if (!text) return '';
    const entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&mdash;': '\u2014',  // —
        '&ndash;': '\u2013',  // –
        '&nbsp;': ' ',
        '&hellip;': '\u2026', // …
        '&lsquo;': '\u2018',  // '
        '&rsquo;': '\u2019',  // '
        '&ldquo;': '\u201C',  // "
        '&rdquo;': '\u201D',  // "
        '&bull;': '\u2022',   // •
        '&copy;': '\u00A9',   // ©
        '&reg;': '\u00AE',    // ®
        '&trade;': '\u2122'   // ™
    };

    let result = text;
    for (const [entity, char] of Object.entries(entities)) {
        result = result.split(entity).join(char);
    }

    // 处理数字实体
    result = result.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    result = result.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

    return result;
}

const feedsDir = path.join(__dirname, '..', 'data', 'feeds');
let fixedCount = 0;
let filesModified = 0;

console.log('开始修复 HTML 实体...\n');

if (fs.existsSync(feedsDir)) {
    const sources = fs.readdirSync(feedsDir);

    for (const source of sources) {
        const sourceDir = path.join(feedsDir, source);
        if (!fs.statSync(sourceDir).isDirectory()) continue;

        const files = fs.readdirSync(sourceDir);

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            const filePath = path.join(sourceDir, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            let modified = false;

            const items = content.items || [];

            for (const item of items) {
                // 修复 title
                if (item.title && item.title.includes('&')) {
                    const decoded = decodeHtmlEntities(item.title);
                    if (decoded !== item.title) {
                        console.log(`[${source}] 修复: "${item.title.slice(0, 50)}..."`);
                        console.log(`       -> "${decoded.slice(0, 50)}..."\n`);
                        item.title = decoded;
                        modified = true;
                        fixedCount++;
                    }
                }

                // 修复 originalTitle
                if (item.originalTitle && item.originalTitle.includes('&')) {
                    const decoded = decodeHtmlEntities(item.originalTitle);
                    if (decoded !== item.originalTitle) {
                        console.log(`[${source}] 修复 originalTitle: "${item.originalTitle.slice(0, 50)}..."`);
                        console.log(`                      -> "${decoded.slice(0, 50)}..."\n`);
                        item.originalTitle = decoded;
                        modified = true;
                        fixedCount++;
                    }
                }
            }

            if (modified) {
                fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
                filesModified++;
            }
        }
    }
}

console.log('='.repeat(50));
console.log(`修复完成！共修复 ${fixedCount} 个标题，修改了 ${filesModified} 个文件`);
