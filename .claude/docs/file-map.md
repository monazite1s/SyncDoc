# 文件路径映射

> Agent 快速定位：看到需求 → 找到文件 → 开始工作

## 前端路由 → 文件

| URL          | 文件                                     | 类型             |
| ------------ | ---------------------------------------- | ---------------- |
| `/`          | `frontend/app/page.tsx`                  | Server Component |
| `/login`     | `frontend/app/(auth)/login/page.tsx`     | Client Component |
| `/register`  | `frontend/app/(auth)/register/page.tsx`  | Client Component |
| `/documents` | `frontend/app/(main)/documents/page.tsx` | Client Component |
| `/settings`  | `frontend/app/(main)/settings/page.tsx`  | Client Component |

## 布局层级

```
frontend/app/layout.tsx              ← 根布局: 字体 + AppProvider(ThemeProvider)
├── frontend/app/(auth)/layout.tsx   ← 认证布局: 居中卡片
└── frontend/app/(main)/layout.tsx   ← 主布局: Header + AuthGuard + content
```

## 按功能查找

### 认证相关

```
前端认证状态:     frontend/stores/auth.store.ts
前端 API 客户端:  frontend/lib/api/client.ts
前端路由保护:     frontend/middleware.ts
前端认证守卫:     frontend/components/common/auth-guard.tsx
后端认证控制器:   backend/src/modules/auth/auth.controller.ts
后端认证服务:     backend/src/modules/auth/auth.service.ts
后端 JWT 策略:    backend/src/modules/auth/strategies/jwt.strategy.ts
后端认证 DTO:     backend/src/modules/auth/dto/
```

### 主题/样式

```
CSS 变量:         frontend/app/globals.css
Tailwind 配置:    frontend/tailwind.config.ts
主题切换:         frontend/providers/theme-provider.tsx
Provider 组装:    frontend/providers/app-provider.tsx
```

### 编辑器/协同

```
Hocuspocus 服务:  backend/src/modules/collaboration/collaboration.hocuspocus.ts
协同业务逻辑:     backend/src/modules/collaboration/collaboration.service.ts
Tiptap 集成:      frontend/components/editor/ (待创建)
Yjs 客户端:       frontend/lib/yjs/ (待创建)
协同光标样式:     frontend/app/globals.css (.collaboration-cursor__*)
```

### 数据层

```
Prisma Schema:    backend/prisma/schema.prisma
Prisma 服务:      backend/src/prisma/prisma.service.ts
数据库迁移:       backend/prisma/migrations/
数据库种子:       backend/prisma/seed.ts
```

### 共享类型

```
类型定义:         packages/types/src/index.ts
前端 re-export:   frontend/types/index.ts
前端 tsconfig:    frontend/tsconfig.json (paths: @collab/types)
后端 tsconfig:    backend/tsconfig.json (paths: @collab/types)
```

### 配置

```
Monorepo:         pnpm-workspace.yaml
基础 TS 配置:     tsconfig.base.json
Docker:           docker-compose.yml
环境变量:         .env.example, backend/.env.example, frontend/.env.example
Turborepo:        turbo.json
Husky:            .husky/
ESLint:           packages/eslint-config/
Prettier:         packages/prettier-config/
```

## 错误边界

```
路由级错误:       frontend/app/error.tsx
404:              frontend/app/not-found.tsx
全局错误:         frontend/app/global-error.tsx
加载状态:         frontend/app/(main)/loading.tsx
```

## 后端 API 路由

| 方法 | 路径               | 控制器                  | 说明       |
| ---- | ------------------ | ----------------------- | ---------- |
| POST | /api/auth/register | AuthController          | 注册       |
| POST | /api/auth/login    | AuthController          | 登录       |
| POST | /api/auth/logout   | AuthController          | 登出       |
| POST | /api/auth/refresh  | AuthController          | 刷新 token |
| GET  | /api/auth/me       | AuthController          | 当前用户   |
| WS   | :3002              | CollaborationHocuspocus | 协同编辑   |
