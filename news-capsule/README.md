# 💊 新闻胶囊 (News Capsule)

> 像吞服胶囊一样简单，在最短时间内获取不应错过的科技资讯

每日精选 7-10 条高质量科技要闻，3 分钟读完，让你不错过重要信息，又不陷入无限信息流焦虑。

## ✨ 功能特性

- **智能筛选** - AI 从多个信息源中筛选当日最重要的新闻
- **深度摘要** - 每条新闻包含标题、要点、具体细节、背景和影响分析
- **中英双语** - 支持中文和英文两个版本
- **自动更新** - Vercel Cron 每日自动生成新闻
- **跨语言摘要** - AI 直接从英文源生成中文摘要，无需翻译步骤
- **智能去重** - AI 识别并去除报道同一事件的重复条目

## 🚀 快速开始

### 1. 安装依赖

```bash
cd news-capsule
npm install
```

### 2. 配置环境变量

复制 `env.example` 为 `.env.local` 并填写：

```bash
cp env.example .env.local
```

```env
# 必需
OPENAI_API_KEY=your_openai_api_key

# 可选（仅用于特殊翻译需求）
# DEEPL_API_KEY=your_deepl_api_key

# Vercel Cron 验证（部署时配置）
CRON_SECRET=your_cron_secret
```

### 3. 本地运行

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 4. 手动生成新闻（本地测试）

```bash
# 生成中文版
export $(cat .env.local | xargs) && node scripts/generate-news.js zh

# 生成英文版
export $(cat .env.local | xargs) && node scripts/generate-news.js en
```

## 📁 项目结构

```
news-capsule/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── generate-news/  # 新闻生成 API（Cron 调用）
│   │   ├── news/           # 获取新闻 API
│   │   ├── dates/          # 获取可用日期 API
│   │   └── subscribe/      # 邮箱订阅 API
│   ├── page.js             # 首页
│   └── globals.css         # 全局样式（Notion 风格）
├── components/             # React 组件
│   ├── Header.js           # 顶部导航（含语言切换）
│   ├── NewsCard.js         # 新闻卡片
│   ├── DatePicker.js       # 日期选择器
│   ├── SubscribeModal.js   # 订阅弹窗
│   └── Footer.js           # 底部
├── scripts/                # 脚本
│   ├── config.js           # RSS 源和 Prompt 配置
│   └── generate-news.js    # 本地新闻生成脚本
├── data/
│   ├── news/               # 生成的新闻 JSON
│   └── raw/                # 原始数据归档（30 天）
├── lib/                    # 工具函数
├── vercel.json             # Vercel Cron 配置
└── env.example             # 环境变量模板
```

## 🛠 技术栈

| 技术               | 用途              |
| ------------------ | ----------------- |
| Next.js 16         | 前端框架          |
| OpenAI GPT-4o-mini | AI 筛选和摘要生成 |
| Readability        | 文章正文提取      |
| Vercel Cron        | 定时任务          |

## 📚 相关文档

- [技术架构](docs/ARCHITECTURE.md) - 系统概览、数据流图
- [开发指南](docs/DEVELOPMENT.md) - 环境配置、调试技巧
- [产品需求文档 (PRD)](docs/PRD.md)
- [后台管理 PRD](docs/admin-prd.md)
- [开发进度](docs/task.md)
- [功能演示](docs/walkthrough.md)
- [Agent 开发指南](docs/AGENT_GUIDE.md)

## 📝 License

MIT
