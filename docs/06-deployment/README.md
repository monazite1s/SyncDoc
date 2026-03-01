# 部署与运维

## 概述

本文档描述如何使用 **GitHub 免费生态**部署协同文档编辑系统，包括前端、后端、数据库和监控。

## 部署架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub 免费生态部署架构                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   GitHub    │    │   Vercel    │    │  Railway/   │        │
│  │   (代码托管) │───▶│  (前端部署)  │    │  Render     │        │
│  │             │    │             │    │  (后端部署)  │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                                       │               │
│         │ GitHub Actions                        │               │
│         ▼                                       ▼               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Neon /    │    │  Upstash    │    │  Cloudflare │        │
│  │  Supabase   │◀───│   (Redis)   │    │    (CDN)    │        │
│  │ (PostgreSQL)│    │             │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 平台选型

| 平台 | 用途 | 免费额度 | 说明 |
|------|------|----------|------|
| **GitHub** | 代码托管 | 无限私有仓库 | CI/CD |
| **Vercel** | Next.js 前端 | 100GB 带宽/月 | 自动部署 |
| **Railway** | NestJS 后端 | $5/月额度 | WebSocket 支持 |
| **Render** | NestJS 备选 | 750 小时/月 | 免费实例 |
| **Neon** | PostgreSQL | 0.5GB 存储 | Serverless |
| **Upstash** | Redis | 10,000 命令/天 | Serverless |
| **Cloudflare** | CDN + DNS | 无限 | 全球加速 |

## 文档目录

| 文档 | 说明 |
|------|------|
| [platform-overview.md](./platform-overview.md) | 免费平台概览 |
| [vercel-deploy.md](./vercel-deploy.md) | Vercel 前端部署 |
| [railway-render.md](./railway-render.md) | Railway/Render 后端部署 |
| [database-setup.md](./database-setup.md) | 数据库配置 |
| [cicd-pipeline.md](./cicd-pipeline.md) | GitHub Actions CI/CD |
| [environment.md](./environment.md) | 环境变量配置 |
| [monitoring.md](./monitoring.md) | 监控与日志 |

## 部署流程

### 1. 代码托管

```bash
# 初始化 Git 仓库
git init
git add .
git commit -m "Initial commit"

# 推送到 GitHub
git remote add origin https://github.com/username/collab-editor.git
git push -u origin main
```

### 2. 前端部署 (Vercel)

```bash
# 安装 Vercel CLI
pnpm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

### 3. 后端部署 (Railway)

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署
railway up
```

### 4. 数据库配置

```bash
# Neon PostgreSQL
# 1. 访问 https://neon.tech
# 2. 创建项目
# 3. 获取连接字符串

# Upstash Redis
# 1. 访问 https://upstash.com
# 2. 创建数据库
# 3. 获取 REST URL 和 Token
```

## 部署检查清单

### 部署前

- [ ] 环境变量配置完整
- [ ] 数据库迁移准备就绪
- [ ] 前端构建成功
- [ ] 后端测试通过
- [ ] 安全配置检查

### 部署后

- [ ] 前端访问正常
- [ ] API 响应正常
- [ ] WebSocket 连接成功
- [ ] 数据库连接正常
- [ ] 监控告警配置

## 成本估算

| 资源 | 免费额度 | 预估用量 | 是否够用 |
|------|----------|----------|----------|
| 前端带宽 | 100GB/月 | 10-20GB | ✅ |
| 后端实例 | 512MB RAM | 256-512MB | ⚠️ |
| PostgreSQL | 0.5GB | 100-200MB | ✅ |
| Redis | 10K 命令/天 | 5-8K | ⚠️ |

**结论**：对于个人项目或小团队，免费额度足够使用。

## 相关文档

- [系统架构](../01-architecture/README.md)
- [安全设计](../02-security/README.md)
- [开发排期](../07-schedule/development-schedule.md)
