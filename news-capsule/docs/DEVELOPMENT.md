# 新闻胶囊 - 开发指南

## 环境准备

### 1. 安装依赖

```bash
cd news-capsule
npm install
```

### 2. 配置环境变量

```bash
cp env.example .env.local
```

编辑 `.env.local`：

```env
# 必需
OPENAI_API_KEY=sk-xxx

# 可选（仅用于特殊翻译需求）
# DEEPL_API_KEY=xxx

# 生产环境（Vercel 自动配置）
CRON_SECRET=xxx
```

### 3. 启动开发服务器

```bash
npm run dev
# 访问 http://localhost:3000
```

---

## 本地新闻生成

推荐使用脚本而非 API（功能更完整）：

```bash
# 中文版
export $(cat .env.local | xargs) && node scripts/generate-news.js zh

# 英文版
export $(cat .env.local | xargs) && node scripts/generate-news.js en
```

### 生成过程输出示例

```
=== News Capsule - Daily News Generator ===

Language: 中文

Using 5 sources: TechCrunch, The Verge, BBC Technology, 36氪, 虎嗅

Fetching from TechCrunch...
  Got 12 items from TechCrunch
Fetching from The Verge...
  Got 8 items from The Verge
...
Total fetched: 45 news items

Filtering important news with AI...
Selected 15 important news items

Fetching full article content...
  [1/15] Apple announces new MacBook...
    ✅ Got 4523 chars
  [2/15] OpenAI releases GPT-5...
    ✅ Got 3891 chars
...

Generating summaries...
  [1/12] Apple announces new MacBook...
    ✅ Generated summary in Chinese
...

Deduplicating news...
🔄 Deduplication: 12 → 10 items

✅ Generated 10 news items (deduped from 12)
📁 Saved to: data/news/2026-01-04-zh.json
```

---

## 常见开发任务

### 添加新 RSS 信息源

编辑 `scripts/config.js`：

```javascript
export const RSS_SOURCES = [
  {
    name: '新源名称',
    url: 'https://example.com/rss.xml',
    language: 'en',  // 或 'zh'
    category: 'tech'
  },
  // ...
];
```

### 调整新闻数量

编辑 `scripts/config.js` 中的 `FILTER_PROMPT`：

```
选出最重要的12-15条新闻  ← 修改这里
```

### 修改 AI Prompt

所有 Prompt 在 `scripts/config.js`：

| 变量                | 用途                             |
| ------------------- | -------------------------------- |
| `SUMMARY_PROMPT_ZH` | 生成中文摘要（接受任何语言输入） |
| `SUMMARY_PROMPT_EN` | 生成英文摘要（接受任何语言输入） |
| `FILTER_PROMPT`     | 新闻筛选                         |
| `DEDUPE_PROMPT`     | 去重检测                         |

### 修改新闻卡片样式

- 组件：`components/NewsCard.js`
- 样式：`app/globals.css`

---

## 调试技巧

### 查看生成的数据

```bash
# 今日新闻数量
cat data/news/2026-01-04-zh.json | jq '.news | length'

# 查看第一条新闻
cat data/news/2026-01-04-zh.json | jq '.news[0]'

# 原始 RSS 数据
cat data/raw/2026-01-04/rss.json | jq '.items | length'
```

### 查看文章原文

```bash
ls data/raw/2026-01-04/articles/
cat data/raw/2026-01-04/articles/0.json | jq '.title, .contentLength'
```

### 测试单个 RSS 源

```bash
node -e "
const Parser = require('rss-parser');
const parser = new Parser();
parser.parseURL('https://techcrunch.com/feed/')
  .then(feed => console.log(feed.items.slice(0, 3).map(i => i.title)))
  .catch(console.error);
"
```

---

## 常见问题

### Q: 为什么有些新闻没有内容？

新闻网站可能阻止抓取，或页面结构特殊导致 Readability 无法提取。检查日志中的 `❌ Skipped`。

### Q: 英文新闻可以输出中文摘要吗？

可以。Prompt 选择与目标语言相关，不与输入新闻语言相关。使用 `node scripts/generate-news.js zh` 会对所有新闻（包括英文源）生成中文摘要。

### Q: 本地和 Vercel 生成的新闻不同？

- 本地脚本 (`scripts/generate-news.js`) 功能更完整
- Vercel Cron 调用的是 `app/api/generate-news/route.js`（简化版）

建议：生产环境也使用脚本，通过 GitHub Actions 触发。

### Q: 如何清理旧数据？

原始数据自动清理（30天），新闻 JSON 需手动清理：

```bash
rm data/news/2026-01-01-*.json
```

---

## 部署

### Vercel 部署

```bash
npm i -g vercel
vercel
```

在 Vercel Dashboard 设置环境变量：
- `OPENAI_API_KEY`
- `DEEPL_API_KEY`（可选）
- `CRON_SECRET`

### Cron 配置

`vercel.json` 配置每日 UTC 00:00 运行：

```json
{
  "crons": [{
    "path": "/api/generate-news?lang=zh",
    "schedule": "0 0 * * *"
  }]
}
```

---

## 相关文档

- [技术架构](ARCHITECTURE.md)
- [Agent 开发指南](AGENT_GUIDE.md)
- [产品需求文档](PRD.md)
