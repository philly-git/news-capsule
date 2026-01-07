# 新闻胶囊 - 开发完成报告

> 💊 像吞服胶囊一样简单，在最短时间内获取不应错过的科技资讯

---

## 已完成功能

### Phase 1-2: MVP + 数据源接入 ✅
- Notion风格的简洁设计（浅色、扁平、无阴影）
- 每日7-10条精选新闻展示
- 新闻卡片：标题、要点、具体细节（keyInfo）、影响分析、来源链接
- "今日更新完毕"状态提示
- 邮箱订阅功能
- 中英文界面切换

### Phase 3: 部署 ✅
- Vercel部署
- Cron定时任务（每天UTC 00:00自动生成）

### Phase 4: 质量优化 ✅
- **DeepL翻译集成**：替代LLM翻译，确保数字单位准确（如 billion → 十亿）
- **AI去重机制**：识别并去除报道同一事件的重复条目
- **完整正文抓取**：使用Readability提取文章全文，提升摘要质量

### Phase 5: 数据管理 ✅
- **原始数据归档**：保存RSS和完整正文到 `data/raw/`
- **30天自动清理**：超过30天的原始数据自动删除

---

## 项目结构

```
news-capsule/
├── app/
│   ├── api/
│   │   ├── generate-news/    # 新闻生成API（Cron调用）
│   │   ├── news/             # 获取新闻API
│   │   ├── dates/            # 获取可用日期API
│   │   └── subscribe/        # 订阅API
│   ├── layout.js
│   ├── page.js
│   └── globals.css           # Notion风格设计系统
├── components/
│   ├── Header.js             # 含语言切换按钮
│   ├── NewsCard.js           # 新闻卡片（含keyInfo展示）
│   ├── DatePicker.js         # 日期选择器
│   ├── SubscribeModal.js
│   └── Footer.js
├── scripts/
│   ├── config.js             # RSS源和Prompt配置
│   └── generate-news.js      # 本地运行脚本（推荐使用）
├── data/
│   ├── news/                 # 新闻JSON数据（按日期+语言）
│   └── raw/                  # 原始数据归档（30天）
│       └── 2026-01-04/
│           ├── rss.json      # RSS原始数据
│           └── articles/     # 完整正文
├── vercel.json               # Cron配置
└── env.example               # 环境变量模板
```

---

## 数据流程

```
RSS源 → AI筛选 → 抓取完整正文 → AI生成摘要 → DeepL翻译(英文源) → AI去重 → 保存JSON
```

---

## 本地开发

### 手动生成新闻

推荐使用本地脚本（功能更完整）：

```bash
# 中文版
export $(cat .env.local | xargs) && node scripts/generate-news.js zh

# 英文版
export $(cat .env.local | xargs) && node scripts/generate-news.js en
```

### 查看原始数据

```bash
# 查看今日RSS原始数据
cat data/raw/2026-01-04/rss.json | head -100

# 查看完整文章
ls data/raw/2026-01-04/articles/
```

---

## 环境变量

| 变量             | 必需 | 说明                |
| ---------------- | ---- | ------------------- |
| `OPENAI_API_KEY` | ✅    | OpenAI API密钥      |
| `DEEPL_API_KEY`  | 可选 | DeepL翻译API密钥    |
| `CRON_SECRET`    | 生产 | Vercel Cron验证密钥 |

---

## 下一步计划

- [ ] 域名绑定
- [ ] 邮件订阅发送功能（Resend）
- [ ] 更多中文信息源
