# Collab Editor - 项目上下文

> 本文件自动加载到每个 Claude Code 会话。修改时保持精简可扫描。

## 项目概述

协同文档编辑器，基于 CRDT (Yjs) 实现实时协同编辑 + 版本回溯。
当前阶段：开发中期，核心框架已搭建，功能实现约 30%。

## 技术栈

| 层级     | 技术                       | 版本       |
| -------- | -------------------------- | ---------- |
| 前端     | Next.js (App Router)       | 15.x       |
| UI       | React + Tailwind CSS       | 19.x / 3.x |
| 后端     | NestJS                     | 11.x       |
| 实时协作 | Hocuspocus + Yjs           | 2.x / 13.x |
| 数据库   | PostgreSQL + Prisma        | 16 / 6.x   |
| 缓存     | Redis (已配置，未完全集成) | 7          |
| 状态管理 | Zustand + persist          | 5.x        |
| 主题     | next-themes (light/dark)   | 0.4.x      |
| Monorepo | pnpm workspace + Turborepo | -          |

## 目录结构速查

```
collab-editor/
├── frontend/                    # Next.js 前端 (port 3000)
│   ├── app/
│   │   ├── layout.tsx           # 根布局: Inter/JetBrains Mono 字体 + ThemeProvider
│   │   ├── globals.css          # CSS 变量: 中性灰调 + Claude 橙强调色
│   │   ├── page.tsx             # 首页 (Server Component)
│   │   ├── error.tsx            # 根级错误边界
│   │   ├── not-found.tsx        # 404
│   │   ├── global-error.tsx     # 全局错误
│   │   ├── (auth)/              # 认证路由组
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   └── (main)/              # 主应用路由组 (需认证)
│   │       ├── layout.tsx       # 主布局 + AuthGuard
│   │       ├── loading.tsx      # 骨架屏
│   │       ├── documents/page.tsx
│   │       └── settings/page.tsx
│   ├── components/
│   │   ├── common/auth-guard.tsx # 客户端认证守卫
│   │   └── ui/                  # Shadcn UI 组件
│   ├── lib/
│   │   ├── api/client.ts        # Axios: withCredentials, 401 自动刷新
│   │   ├── api/auth.ts          # 认证 API 调用
│   │   ├── api/documents.ts     # 文档 API 调用
│   │   └── utils.ts             # cn() 工具函数
│   ├── providers/
│   │   ├── app-provider.tsx     # 组装 ThemeProvider
│   │   └── theme-provider.tsx   # next-themes 封装
│   ├── stores/
│   │   ├── auth.store.ts        # 认证状态: user, isAuthenticated (无 token)
│   │   └── document.store.ts    # 文档状态
│   ├── middleware.ts            # 路由保护: cookie access_token
│   ├── tailwind.config.ts       # 语义化颜色: surface/sidebar/fontFamily
│   └── types/index.ts           # Re-export @collab/types
│
├── backend/                     # NestJS 后端 (port 3001, WS port 3002)
│   ├── src/
│   │   ├── main.ts              # cookieParser + CORS(credentials) + Hocuspocus
│   │   ├── app.module.ts        # 全局模块注册
│   │   ├── common/              # 过滤器/拦截器/守卫
│   │   ├── config/              # 配置
│   │   ├── modules/
│   │   │   ├── auth/            # 认证模块 [完成度 90%]
│   │   │   │   ├── auth.controller.ts  # HttpOnly cookie 认证
│   │   │   │   ├── auth.service.ts     # JWT + bcrypt + Session
│   │   │   │   └── strategies/jwt.strategy.ts  # Cookie 优先提取
│   │   │   ├── collaboration/   # 协同编辑模块 [完成度 85%]
│   │   │   ├── documents/       # 文档模块 [完成度 10% - TODO]
│   │   │   └── versions/        # 版本模块 [完成度 5% - TODO]
│   │   └── prisma/              # Prisma 服务
│   └── prisma/
│       └── schema.prisma        # User/Session/Document/DocumentVersion/DocumentEdit
│
├── packages/
│   ├── types/                   # @collab/types 共享类型包
│   │   └── src/index.ts         # User, Document, Auth, API 响应类型 + 枚举
│   ├── eslint-config/           # @collab/eslint-config
│   ├── prettier-config/         # @collab/prettier-config
│   └── typescript-config/       # @collab/typescript-config
│
├── docs/                        # 设计文档 (详细架构/安全/部署)
├── docker-compose.yml           # postgres + redis + backend + frontend
└── pnpm-workspace.yaml          # frontend + backend + packages/*
```

## 认证流程 (HttpOnly Cookie)

```
登录/注册 → 后端 Set-Cookie: access_token (7天), refresh_token (30天, path=/api/auth/refresh)
         → 前端仅存储 user + isAuthenticated (zustand persist → localStorage)
         → 后续请求: 浏览器自动携带 cookie (withCredentials)

请求受保护资源:
  → NestJS JWT Strategy: 优先从 cookie 提取，兼容 Authorization header
  → 前端 middleware.ts: 从 cookie 检测 access_token，无则重定向 /login

Token 刷新:
  → 401 → 前端自动调用 /api/auth/refresh → 后端读取 refresh_token cookie
  → 成功: Set-Cookie 新 token → 重试原请求
  → 失败: 清除 auth-storage → 跳转 /login
```

## 主题系统

```
配色: 中性现代灰调 + Claude 橙 (#D97757 light / #E08860 dark)
CSS 变量: globals.css (:root / .dark)
Tailwind: tailwind.config.ts 语义化 token (bg-background, text-foreground 等)
字体: Inter (正文) + JetBrains Mono (代码), next/font/google
切换: next-themes, attribute="class", defaultTheme="light"
```

## 模块完成度

| 模块                 | 完成度 | 关键文件                                                |
| -------------------- | ------ | ------------------------------------------------------- |
| Auth (后端)          | 90%    | auth.controller.ts, auth.service.ts, jwt.strategy.ts    |
| Collaboration (后端) | 85%    | collaboration.hocuspocus.ts, collaboration.service.ts   |
| Documents (后端)     | 10%    | documents.controller.ts (TODO)                          |
| Versions (后端)      | 5%     | versions.controller.ts (TODO)                           |
| 前端认证             | 70%    | auth.store.ts, client.ts, middleware.ts, auth-guard.tsx |
| 前端主题             | 95%    | globals.css, tailwind.config.ts, theme-provider.tsx     |
| 前端编辑器           | 20%    | tiptap 集成存在但页面未完成                             |
| 共享类型             | 80%    | @collab/types (前端已接入，后端待迁移 DTO)              |

## 常用命令

```bash
pnpm install                    # 安装所有依赖
pnpm --filter frontend dev      # 启动前端开发服务器 (3000)
pnpm --filter backend dev       # 启动后端开发服务器 (3001+3002)
pnpm --filter frontend build    # 构建前端
pnpm --filter backend type-check # 后端类型检查
pnpm --filter frontend test     # 前端测试 (vitest)
docker-compose up -d            # 启动 PostgreSQL + Redis
```

## 关键约定

- **不可变模式**: 使用 spread/operator 创建新对象，绝不修改现有对象
- **文件大小**: 200-400 行典型，800 行最大
- **CSS**: 使用语义化 token (`bg-background`, `text-foreground`)，不硬编码色值
- **API 响应**: `{ success, data, timestamp }` 统一格式
- **类型共享**: 使用 `@collab/types` 包，前端 types/index.ts 仅 re-export
- **认证**: HttpOnly cookie，前端不接触 token 值
- **组件优先级**: Shadcn UI > 项目组件 > 第三方库
- **Git commit**: `<type>: <description>` (feat/fix/refactor/docs/test/chore)

## 已知问题

- Redis 模块目录存在但未实际集成
- Documents/Versions 后端模块为 TODO 空壳
- 登录/注册表单仅为 UI placeholder，无 onSubmit 逻辑
- 前端所有页面为 'use client'，未利用 RSC

## 架构分析

详见 `ARCHITECTURE_ANALYSIS.md` — 包含 Next+Nest 架构合理性评估和替代方案对比。
