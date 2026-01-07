# 新闻胶囊 - Agent 开发指南

> 本文档专为 AI Agent 设计，帮助你快速理解项目结构并开始开发。

---

## 项目概述

**新闻胶囊** 是一个科技新闻聚合网站，每日自动抓取、筛选和生成 7-10 条精选新闻摘要，支持中英双语。

**技术栈**：Next.js 16 + OpenAI GPT-4o-mini + Vercel Cron

---

## 核心文件

| 文件                       | 用途                 | 优先阅读 |
| -------------------------- | -------------------- | -------- |
| `scripts/generate-news.js` | 新闻生成核心逻辑     | ⭐⭐⭐      |
| `scripts/config.js`        | RSS源和AI Prompt配置 | ⭐⭐⭐      |
| `app/page.js`              | 首页渲染逻辑         | ⭐⭐       |
| `app/api/news/route.js`    | 获取新闻API          | ⭐⭐       |
| `components/NewsCard.js`   | 新闻卡片组件         | ⭐        |

---

## 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        generate-news.js                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. fetchAllNews()      → 从RSS源抓取24小时内新闻               │
│          ↓                                                      │
│  2. filterImportantNews() → GPT筛选7-10条重要新闻               │
│          ↓                                                      │
│  3. fetchFullContent()   → Readability提取完整正文              │
│          ↓                                                      │
│  4. processNewsItem()    → 根据目标语言生成摘要                 │
│       └── generateSummary(newsItem, targetLanguage)              │
│          ↓                                                      │
│  5. deduplicateNews()    → GPT去除重复新闻                      │
│          ↓                                                      │
│  6. 保存到 data/news/{date}-{lang}.json                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 常见开发任务

### 1. 添加新的 RSS 信息源

编辑 `scripts/config.js`：

```javascript
export const RSS_SOURCES = [
  // 在此添加新源
  {
    name: '新源名称',
    url: 'https://example.com/feed.xml',
    language: 'en',  // 或 'zh'
    category: 'tech'
  },
  // ... 现有源
];
```

### 2. 修改 AI Prompt

所有 Prompt 定义在 `scripts/config.js`：

| Prompt变量          | 用途                             |
| ------------------- | -------------------------------- |
| `SUMMARY_PROMPT_ZH` | 生成中文摘要（接受任何语言输入） |
| `SUMMARY_PROMPT_EN` | 生成英文摘要（接受任何语言输入） |
| `FILTER_PROMPT`     | 新闻重要性筛选                   |
| `DEDUPE_PROMPT`     | 重复新闻检测                     |

### 3. 调整每日新闻数量

编辑 `scripts/config.js` 中 `FILTER_PROMPT`：

```
从以下新闻中选出最重要的7-10条新闻  ← 修改这里的数字
```

### 4. 修改新闻卡片样式

编辑 `components/NewsCard.js` 和 `app/globals.css`

### 5. 添加新的 API 路由

在 `app/api/` 下创建新目录：

```
app/api/your-route/route.js
```

---

## 本地调试

### 运行新闻生成脚本

```bash
# 加载环境变量并运行
export $(cat .env.local | xargs) && node scripts/generate-news.js zh
```

### 查看生成的数据

```bash
# 今日新闻
cat data/news/2026-01-04-zh.json | jq '.news | length'

# 原始RSS数据
cat data/raw/2026-01-04/rss.json | jq '.items | length'
```

### 启动开发服务器

```bash
npm run dev
# 访问 http://localhost:3000
```

---

## 环境变量

| 变量             | 必需 | 说明                             |
| ---------------- | ---- | -------------------------------- |
| `OPENAI_API_KEY` | ✅    | OpenAI API密钥，用于AI筛选和摘要 |
| `CRON_SECRET`    | 生产 | Vercel Cron验证，本地开发不需要  |

---

## 数据结构

### 新闻 JSON (`data/news/2026-01-04-zh.json`)

```json
{
  "date": "2026-01-04",
  "publishedAt": "2026-01-04T08:00:00.000Z",
  "language": "zh",
  "news": [
    {
      "id": "news-1735948800000-0",
      "title": "一句话标题",
      "highlights": ["要点1", "要点2", "要点3"],
      "keyInfo": ["具体细节1", "具体细节2"],
      "context": "背景信息",
      "impact": "影响分析",
      "source": {
        "name": "TechCrunch",
        "url": "https://...",
        "language": "en",
        "readTime": "5 分钟"
      }
    }
  ]
}
```

---

## 注意事项

1. **API 路由版本过时**：`app/api/generate-news/route.js` 是早期版本，功能不如 `scripts/generate-news.js` 完整（缺少去重、完整正文抓取）。本地开发请使用脚本。

2. **原始数据归档**：`data/raw/` 会自动保留30天的RSS和文章原文，超过30天自动清理。

3. **Prompt 语言逻辑**：Prompt 选择只与目标输出语言相关，不与输入新闻语言相关。中文 prompt 可以直接处理英文新闻并输出中文摘要。

4. **Vercel Cron**：生产环境每天 UTC 00:00（北京时间 08:00）自动运行。配置见 `vercel.json`。
