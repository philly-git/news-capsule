# 新闻胶囊 - 技术架构

## 系统概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              新闻胶囊系统架构                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│   │  Admin 面板     │    │   Vercel Cron   │    │  RSS 信息源     │         │
│   │  /admin         │    │   定时触发       │    │  (sources.json) │         │
│   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│            │                      │                      │                  │
│            ▼                      ▼                      ▼                  │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     generate-news.js (核心脚本)                      │   │
│   │   ├── 读取 sources.json 获取启用的信息源                              │   │
│   │   ├── 从本地缓存或 RSS 获取新闻                                       │   │
│   │   ├── 数据标准化 (HTML→纯文本, 计算字数)                              │   │
│   │   ├── GPT-4o-mini 标题去重                                           │   │
│   │   └── GPT-4o-mini 生成摘要                                           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          data/ (数据存储)                            │   │
│   │   ├── sources.json     统一信息源配置                                │   │
│   │   └── feeds/           按源分组的数据                                │   │
│   │       ├── {sourceId}/                                                │   │
│   │       │   ├── items.json              原始 RSS+正文                  │   │
│   │       │   └── {date}-{lang}.json      AI 处理后的摘要                │   │
│   │       └── ...                                                        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                       Next.js 前端 + API                             │   │
│   │   ├── /              首页 (按源分组展示新闻)                          │   │
│   │   ├── /admin         管理后台 (信息源管理)                            │   │
│   │   └── /api/*         REST API                                        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 数据流详解

### 新闻生成流程 (`generate-news.js`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            新闻生成数据流                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                                                         │
│  │ 1. 数据加载     │  fetchAllNews()                                         │
│  │                 │  • 读取 sources.json 获取启用的信息源                    │
│  │                 │  • 优先读取本地缓存 data/feeds/{sourceId}/items.json     │
│  │                 │  • 无缓存时从 RSS 源在线抓取                             │
│  │                 │  • 过滤 48 小时内的新闻，每源最多 20 条                  │
│  └────────┬────────┘                                                         │
│           ▼                                                                  │
│  ┌─────────────────┐                                                         │
│  │ 2. 数据标准化   │  normalizeItem()                                        │
│  │                 │  • HTML → 纯文本 (html-to-text)                          │
│  │                 │  • 计算字数 (优先使用缓存值)                             │
│  │                 │  • 统一数据格式                                         │
│  └────────┬────────┘                                                         │
│           ▼                                                                  │
│  ┌─────────────────┐                                                         │
│  │ 3. 标题去重     │  deduplicateByTitle()                                   │
│  │                 │  • GPT-4o-mini 识别报道同一事件的条目                    │
│  │                 │  • 保留信息更丰富的一条                                  │
│  └────────┬────────┘                                                         │
│           ▼                                                                  │
│  ┌─────────────────┐                                                         │
│  │ 4. 摘要生成     │  processNewsBySource() + generateSummary()              │
│  │                 │                                                         │
│  │  按源分组处理 ───┼──► 为每条新闻调用 GPT-4o-mini                           │
│  │                 │                                                         │
│  │  输出格式：     │                                                         │
│  │  • title        │  一句话标题 (15-30字)                                   │
│  │  • summary      │  核心要点描述 (100-200字)                               │
│  │  • readOriginal │  阅读原文推荐 (1-5分 + 理由)                            │
│  │    Recommendation│                                                        │
│  └────────┬────────┘                                                         │
│           ▼                                                                  │
│  ┌─────────────────┐                                                         │
│  │ 5. 保存输出     │  saveNewsBySource()                                     │
│  │                 │  保存到 data/feeds/{sourceId}/{date}-{lang}.json        │
│  └─────────────────┘                                                         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 前端数据流

```
用户访问首页
      │
      ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────────────────┐
│  page.js    │ ───► │ /api/feeds  │ ───► │ data/feeds/{sourceId}/  │
│  (首页)     │      │  route.js   │      │   {date}-{lang}.json    │
└─────────────┘      └─────────────┘      └─────────────────────────┘
      │
      ├── 语言切换 (lang=zh/en) → 重新请求对应语言 JSON
      │
      └── 日期切换 → /api/dates 获取可用日期 → 请求对应日期 JSON
      │
      ▼
┌─────────────────────────────────────────┐
│  按「信息源」分组展示                     │
│  ├── SourceGroup (可展开/折叠)           │
│  │   └── NewsCard (单条新闻)             │
│  └── ...                                 │
└─────────────────────────────────────────┘
```

---

## 目录结构

```
news-capsule/
├── app/                          # Next.js App Router
│   ├── page.js                   # 首页（按源分组展示新闻）
│   ├── layout.js                 # 全局布局
│   ├── globals.css               # 全局样式（Notion 风格）
│   ├── admin/                    # 管理后台
│   │   ├── page.js
│   │   └── admin.module.css
│   └── api/                      # API 路由
│       ├── feeds/route.js        # ⭐ 主要 API：获取按源分组的新闻
│       ├── dates/route.js        # 获取可用日期列表
│       ├── news/route.js         # 兼容旧格式
│       ├── generate-news/route.js # Cron 触发（简化版）
│       └── subscribe/route.js    # 邮箱订阅
│
├── components/                   # React 组件
│   ├── Header.js                 # 顶部导航 + 语言切换
│   ├── SourceGroup.js            # ⭐ 信息源分组组件（可折叠）
│   ├── NewsCard.js               # 新闻卡片
│   ├── DatePicker.js             # 日期选择器
│   ├── SubscribeModal.js         # 订阅弹窗
│   └── Footer.js                 # 底部
│
├── scripts/                      # 脚本（核心逻辑）
│   ├── generate-news.js          # ⭐ 新闻生成主脚本
│   └── config.js                 # Prompt 配置
│
├── data/                         # 数据存储
│   ├── sources.json              # ⭐ 统一信息源配置
│   ├── feeds/                    # ⭐ 按源分组的数据
│   │   ├── the-verge/
│   │   │   ├── items.json        # RSS 原始数据（含完整正文）
│   │   │   └── 2026-01-05-zh.json # AI 处理后的摘要
│   │   ├── geekpark/
│   │   │   ├── items.json
│   │   │   └── 2026-01-05-zh.json
│   │   └── ...
│   ├── news/                     # 旧格式（保留兼容）
│   └── subscribers.json          # 订阅者列表
│
├── lib/                          # 工具函数
├── vercel.json                   # Cron 配置
└── env.example                   # 环境变量模板
```

---

## 技术栈

| 层级     | 技术                 | 版本 |
| -------- | -------------------- | ---- |
| 前端框架 | Next.js (App Router) | 16.x |
| React    | React                | 19.x |
| AI 摘要  | OpenAI GPT-4o-mini   | -    |
| 正文提取 | html-to-text         | -    |
| DOM 解析 | jsdom                | 27.x |
| RSS 解析 | rss-parser           | 3.x  |
| 部署     | Vercel               | -    |

---

## API 端点

| 端点                 | 方法 | 说明                                                 |
| -------------------- | ---- | ---------------------------------------------------- |
| `/api/feeds`         | GET  | ⭐ 主要 API，获取按源分组的新闻，参数: `date`, `lang` |
| `/api/dates`         | GET  | 获取可用日期列表，参数: `lang`                       |
| `/api/news`          | GET  | 兼容旧格式，参数: `date`, `lang`                     |
| `/api/subscribe`     | POST | 邮箱订阅                                             |
| `/api/generate-news` | GET  | Cron 触发新闻生成                                    |

---

## 数据格式

### 信息源配置 (`data/sources.json`)

```json
{
  "version": 1,
  "updatedAt": "2026-01-05T06:21:06.662Z",
  "sources": [
    {
      "id": "the-verge",
      "name": "The Verge",
      "url": "https://www.theverge.com/rss/index.xml",
      "language": "en",
      "category": "tech",
      "enabled": true,
      "addedAt": "2026-01-01T00:00:00Z"
    },
    {
      "id": "geekpark",
      "name": "极客公园",
      "url": "https://wechat2rss.xlab.app/feed/xxx.xml",
      "language": "zh",
      "category": "tech",
      "enabled": true,
      "addedAt": "2026-01-04T14:22:23.110Z"
    }
  ]
}
```

### RSS 原始数据 (`data/feeds/{sourceId}/items.json`)

```json
{
  "source": {
    "id": "the-verge",
    "name": "The Verge",
    "url": "https://www.theverge.com/rss/index.xml"
  },
  "lastSyncAt": "2026-01-05T08:00:00.000Z",
  "items": [
    {
      "title": "原始标题",
      "link": "https://...",
      "pubDate": "2026-01-05T...",
      "content": "<p>完整 HTML 正文...</p>",
      "wordCount": 1200
    }
  ]
}
```

### AI 处理后的新闻 (`data/feeds/{sourceId}/{date}-{lang}.json`)

```json
{
  "date": "2026-01-05",
  "language": "zh",
  "source": {
    "id": "the-verge",
    "name": "The Verge",
    "language": "en"
  },
  "items": [
    {
      "id": "the-verge-1736064000000-0",
      "title": "一句话标题",
      "summary": "核心要点的完整描述，包含关键信息...",
      "readOriginalRecommendation": {
        "score": 4,
        "reason": "原文包含详细的技术实现细节"
      },
      "readTime": "5 分钟",
      "source": {
        "name": "The Verge",
        "url": "https://...",
        "language": "en"
      },
      "originalTitle": "Original English Title",
      "pubDate": "2026-01-05T..."
    }
  ],
  "generatedAt": "2026-01-05T08:30:00.000Z"
}
```

### `/api/feeds` 响应格式

```json
{
  "date": "2026-01-05",
  "language": "zh",
  "sources": [
    {
      "id": "the-verge",
      "name": "The Verge",
      "language": "en",
      "items": [...]
    },
    {
      "id": "geekpark",
      "name": "极客公园",
      "language": "zh",
      "items": [...]
    }
  ],
  "generatedAt": "2026-01-05T08:30:00.000Z"
}
```
