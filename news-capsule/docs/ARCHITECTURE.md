# 新闻胶囊 - 技术架构

## 系统概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              新闻胶囊系统架构                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐                           ┌─────────────────┐         │
│   │  Admin 面板     │                           │  RSS 信息源     │         │
│   │  /admin/*       │                           │  (sources.json) │         │
│   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│            │                      │                      │                  │
│            ▼                      ▼                      ▼                  │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     generate-news.js (核心脚本)                      │   │
│   │   ├── 读取 sources.json 获取启用的信息源                              │   │
│   │   ├── 从本地缓存或 RSS 获取新闻                                       │   │
│   │   ├── 数据标准化 (HTML→纯文本, 计算字数)                              │   │
│   │   └── GPT-4o-mini 生成摘要                                           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      存储抽象层 (lib/storage.js)                     │   │
│   │   ├── 本地开发：文件系统 (data/)                                     │   │
│   │   └── 云端部署：Cloudflare R2 (S3 兼容 API)                          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                       Next.js 前端 + API                             │   │
│   │   ├── /              首页 (按源分组展示新闻)                          │   │
│   │   ├── /admin/*       管理后台 (8个子页面)                             │   │
│   │   └── /api/*         REST API                                        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 数据流详解

### 新闻生成流程

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
│           ▼                                                                  │
│  ┌─────────────────┐                                                         │
│  │ 4. 摘要生成     │  processNewsBySource() + generateSummary()              │
│  │                 │                                                         │
│  │  按源分组处理 ───┼──► 为每条新闻调用 GPT-4o-mini                           │
│  │                 │                                                         │
│  │  输出格式：     │                                                         │
│  │  • editorNote   │  编辑概要 (30-50字)                                     │
│  │  • keyPoints    │  关键要点 (3-4条)                                       │
│  │  • readOriginal │  阅读原文评估 (score/reason/whoShouldRead)              │
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
│  page.js    │ ───► │ /api/feeds  │ ───► │ 存储层 (R2/本地文件)     │
│  (首页)     │      │  route.js   │      │ data/feeds/{sourceId}/  │
└─────────────┘      └─────────────┘      └─────────────────────────┘
      │
      ├── 语言切换 (lang=zh/en) → 重新请求对应语言 JSON
      │
      └── 日期切换 → /api/dates 获取可用日期 → 请求对应日期 JSON
      │
      ▼
┌─────────────────────────────────────────┐
│  按「信息源」分组展示                     │
│  ├── 内容目录 (可折叠)                   │
│  ├── NewsCardLab (极简文学风格卡片)       │
│  └── 底部订阅提示                        │
└─────────────────────────────────────────┘
```

---

## 目录结构

```
news-capsule/
├── app/                          # Next.js App Router
│   ├── page.js                   # 首页（按源分组展示新闻）
│   ├── layout.js                 # 全局布局
│   ├── globals.css               # 全局样式（极简文学风格）
│   ├── ui-lab/                   # UI 实验室
│   ├── admin/                    # 管理后台
│   │   ├── layout.js             # Admin 布局 + 侧边栏
│   │   ├── page.js               # 编辑部工作台
│   │   ├── login/                # 登录页
│   │   ├── sources/              # 信息源管理
│   │   ├── published/            # 已发布内容
│   │   ├── publishing/           # 发布工作台
│   │   ├── prompt-debugger/      # Prompt 调试器
│   │   ├── settings/             # 系统设置
│   │   ├── feedback/             # 用户反馈
│   │   └── articles/             # 文章详情
│   └── api/                      # API 路由
│       ├── feeds/route.js        # ⭐ 主要 API：获取按源分组的新闻
│       ├── dates/route.js        # 获取可用日期列表
│       ├── subscribe/route.js    # 邮箱订阅
│       ├── feedback/route.js     # 用户反馈
│       ├── generate-news/route.js # Cron 触发
│       ├── auth/                 # 认证相关
│       │   ├── login/route.js
│       │   ├── logout/route.js
│       │   └── verify/route.js
│       └── admin/                # Admin API
│           ├── sources/          # 信息源 CRUD
│           ├── published/        # 已发布内容
│           ├── regenerate/       # 重新生成摘要
│           ├── prompt-config/    # Prompt 配置
│           └── ...
│
├── components/                   # React 组件
│   ├── Header.js                 # 顶部导航
│   ├── NewsCardLab.js            # ⭐ 新闻卡片（极简风格）
│   ├── NewsCard.js               # 新闻卡片（经典样式）
│   ├── DatePicker.js             # 日期选择器
│   ├── SubscribeModal.js         # 订阅弹窗
│   ├── FeedbackModal.js          # 反馈弹窗
│   ├── Footer.js                 # 底部
│   └── ...
│
├── lib/                          # 工具库
│   ├── storage.js                # ⭐ 存储抽象层 (R2/本地文件)
│   ├── prompts.js                # ⭐ Prompt 统一管理
│   ├── auth.js                   # 认证逻辑
│   ├── feeds.js                  # Feed 处理
│   ├── sources.js                # 信息源管理
│   ├── news-generator.js         # 新闻生成器
│   └── qualityFilter.js          # 质量过滤
│
├── scripts/                      # 脚本（核心逻辑）
│   ├── generate-news.js          # ⭐ 新闻生成主脚本
│   └── config.js                 # 配置
│
├── data/                         # 本地数据存储
│   ├── sources.json              # ⭐ 统一信息源配置
│   ├── settings.json             # 系统设置
│   ├── subscribers.json          # 订阅者列表
│   ├── feedback.json             # 用户反馈
│   └── feeds/                    # ⭐ 按源分组的数据
│       └── {sourceId}/
│           ├── items.json        # RSS 原始数据
│           └── {date}-{lang}.json # AI 处理后的摘要
│
├── vercel.json                   # Cron 配置
└── env.example                   # 环境变量模板
```

---

## 技术栈

| 层级     | 技术                    | 说明                             |
| -------- | ----------------------- | -------------------------------- |
| 前端框架 | Next.js 16 (App Router) | React 19                         |
| AI 摘要  | OpenAI GPT-4o-mini      | 筛选、摘要生成、去重             |
| 正文提取 | html-to-text            | HTML → 纯文本                    |
| DOM 解析 | jsdom                   | 富文本处理                       |
| RSS 解析 | rss-parser              | RSS/Atom 源解析                  |
| 云端存储 | Cloudflare R2           | S3 兼容，通过 @aws-sdk/client-s3 |
| 本地存储 | 文件系统 (JSON)         | 开发环境使用                     |
| 部署     | Vercel                  | 自动部署、Cron 定时任务          |

---

## 存储层架构

### 环境检测策略

```javascript
// lib/storage.js

// 云端环境：配置了 R2 环境变量
isCloudEnvironment() → R2_ACCOUNT_ID && R2_ACCESS_KEY_ID

// 本地环境：使用文件系统
// 混合策略：云端环境同时读取 R2 和本地文件
```

### 操作函数

| 函数                    | 本地          | 云端                         |
| ----------------------- | ------------- | ---------------------------- |
| `readJSON(path)`        | fs.readFile   | R2.GetObject → fallback 本地 |
| `writeJSON(path, data)` | fs.writeFile  | R2.PutObject                 |
| `deleteData(path)`      | fs.unlink     | R2.DeleteObject              |
| `listFiles(path)`       | fs.readdir    | R2.ListObjects + 本地合并    |
| `exists(path)`          | fs.existsSync | R2.HeadObject ∪ 本地         |

---

## API 端点

### 公开 API

| 端点                 | 方法     | 说明                                |
| -------------------- | -------- | ----------------------------------- |
| `/api/feeds`         | GET      | 获取按源分组的新闻 (`date`, `lang`) |
| `/api/dates`         | GET      | 获取可用日期列表 (`lang`)           |
| `/api/subscribe`     | GET/POST | 订阅者统计/新增订阅                 |
| `/api/feedback`      | POST     | 提交用户反馈                        |
| `/api/generate-news` | GET      | Cron 触发新闻生成                   |

### 认证 API

| 端点               | 方法 | 说明         |
| ------------------ | ---- | ------------ |
| `/api/auth/login`  | POST | Admin 登录   |
| `/api/auth/logout` | POST | 退出登录     |
| `/api/auth/verify` | GET  | 验证登录状态 |

### Admin API

| 端点                       | 方法                | 说明           |
| -------------------------- | ------------------- | -------------- |
| `/api/admin/sources`       | GET/POST/PUT/DELETE | 信息源 CRUD    |
| `/api/admin/published`     | GET                 | 获取已发布内容 |
| `/api/admin/regenerate`    | POST                | 重新生成摘要   |
| `/api/admin/prompt-config` | GET/POST            | Prompt 配置    |
| `/api/admin/articles`      | GET                 | 获取文章详情   |
| `/api/admin/fetch-rss`     | POST                | 手动抓取 RSS   |

---

## 数据格式

### AI 输出格式 (摘要)

```json
{
  "editorNote": "编辑概要，30-50字，包含主体+动作+关键要素",
  "keyPoints": [
    "要点1：15-30字，包含可核查信息",
    "要点2：...",
    "要点3：..."
  ],
  "readOriginal": {
    "score": 2,  // 0-3 分 (0=无增量, 3=不可替代)
    "reason": "原文包含详细技术实现细节和完整代码示例",
    "whoShouldRead": "需要动手实现的开发者"
  }
}
```

### 新闻数据 (`{date}-{lang}.json`)

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
      "originalTitle": "Original English Title",
      "editorNote": "编辑概要...",
      "keyPoints": ["要点1", "要点2", "要点3"],
      "readOriginal": {
        "score": 2,
        "reason": "原文包含...",
        "whoShouldRead": "..."
      },
      "readTime": "5 分钟",
      "wordCount": 1200,
      "source": {
        "name": "The Verge",
        "url": "https://...",
        "language": "en"
      },
      "pubDate": "2026-01-05T...",
      "status": "published",
      "publishedAt": "2026-01-05T10:00:00Z"
    }
  ],
  "generatedAt": "2026-01-05T08:30:00.000Z"
}
```

### 信息源配置 (`sources.json`)

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
    }
  ]
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
    }
  ],
  "generatedAt": "2026-01-05T08:30:00.000Z"
}
```
