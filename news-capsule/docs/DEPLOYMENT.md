# 部署指南

## Vercel 部署

### 1. 连接 GitHub 仓库

在 Vercel Dashboard 中导入项目，连接 GitHub 仓库。

### 2. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

| 变量                   | 说明                                          | 必需 |
| ---------------------- | --------------------------------------------- | ---- |
| `OPENAI_API_KEY`       | OpenAI API Key                                | ✅    |
| `ADMIN_USERS`          | Admin 登录凭据，格式: `user:pass,user2:pass2` | ✅    |
| `R2_ACCOUNT_ID`        | Cloudflare Account ID                         | ✅    |
| `R2_ACCESS_KEY_ID`     | R2 Access Key ID                              | ✅    |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Access Key                          | ✅    |
| `R2_BUCKET_NAME`       | R2 Bucket 名称                                | ✅    |
| `CRON_SECRET`          | Cron 验证密钥                                 | 可选 |
| `DEEPL_API_KEY`        | DeepL API Key（高质量翻译）                   | 可选 |

### 3. Cron 定时任务

项目已配置 `vercel.json`，部署后会自动启用定时任务。

---

## Cloudflare R2 配置

### 1. 创建 R2 Bucket

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 R2 Object Storage
3. 创建 Bucket（建议名称: `news-capsule`）

### 2. 创建 API Token

1. 进入 R2 > Manage R2 API Tokens
2. 创建新 Token，权限选择 "Admin Read & Write"
3. 记录 `Access Key ID` 和 `Secret Access Key`

### 3. 获取 Account ID

在 Cloudflare Dashboard 右侧可以找到 Account ID。

---

## 本地开发

本地开发时使用文件系统存储，无需配置 R2：

```bash
# 复制环境变量模板
cp env.example .env.local

# 填写 OPENAI_API_KEY 和 ADMIN_USERS

# 启动开发服务器
npm run dev
```

数据存储在 `data/` 目录，已被 `.gitignore` 忽略。

---

## 存储策略

| 环境        | 存储方式           |
| ----------- | ------------------ |
| 本地开发    | 文件系统 (`data/`) |
| Vercel 生产 | Cloudflare R2      |

存储抽象层 (`lib/storage.js`) 自动检测环境并选择存储方式。
