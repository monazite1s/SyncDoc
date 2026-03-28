# 前端架构详细设计

## 概述

本文档详细描述协同文档编辑系统的前端架构设计，基于 **Next.js 15 App Router** 构建，集成 **Tiptap 3** 编辑器和 **Yjs** 协同引擎，实现本地优先的实时协同编辑体验。

---

## 目录

- [1. 架构总览](#1-架构总览)
- [2. 技术栈](#2-技术栈)
- [3. 目录结构](#3-目录结构)
- [4. 核心模块设计](#4-核心模块设计)
- [5. 状态管理架构](#5-状态管理架构)
- [6. 数据流设计](#6-数据流设计)
- [7. 组件层次结构](#7-组件层次结构)
- [8. 编辑器架构](#8-编辑器架构)
- [9. 协同客户端架构](#9-协同客户端架构)
- [10. 性能优化策略](#10-性能优化策略)
- [11. 错误处理架构](#11-错误处理架构)
- [12. 安全设计](#12-安全设计)

---

## 1. 架构总览

### 1.1 架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           前端应用架构                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        展示层 (Presentation)                     │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │   │
│  │  │  Pages    │  │Components │  │  Layouts  │  │   Styles  │   │   │
│  │  │(App Router)│  │  (React)  │  │           │  │ (Tailwind)│   │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        状态层 (State)                            │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │   │
│  │  │  Zustand  │  │TanStack Q │  │   Y.Doc   │  │ Awareness │   │   │
│  │  │ (客户端)  │  │ (服务端)  │  │  (协同)   │  │  (临时)   │   │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        服务层 (Services)                         │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │   │
│  │  │ API Client│  │ WebSocket │  │ IndexedDB │  │   Auth    │   │   │
│  │  │   (HTTP)  │  │ Provider  │  │Persistence│  │  Service  │   │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        基础设施层 (Infrastructure)               │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │   │
│  │  │  Browser  │  │   Local   │  │  Network  │  │  Monitor  │   │   │
│  │  │   APIs    │  │  Storage  │  │  (Fetch)  │  │  (Sentry) │   │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 设计原则

| 原则         | 说明                         | 实现                     |
| ------------ | ---------------------------- | ------------------------ |
| **本地优先** | 客户端持有完整状态，离线可用 | Y.Doc + IndexedDB        |
| **组件化**   | 原子设计，组件复用           | React + ShadcnUI         |
| **类型安全** | 全量 TypeScript              | 严格模式 + Zod           |
| **性能优先** | 代码分割、懒加载、缓存       | Next.js + TanStack Query |
| **渐进增强** | 基础功能可用，逐步增强体验   | SSR + CSR 混合           |

---

## 2. 技术栈

### 2.1 核心技术

| 技术             | 版本 | 用途     | 选型理由                  |
| ---------------- | ---- | -------- | ------------------------- |
| **Next.js**      | 15+  | 全栈框架 | App Router 成熟，RSC 支持 |
| **React**        | 19+  | UI 库    | 最新特性，性能优化        |
| **TypeScript**   | 5.5+ | 类型系统 | 类型安全，开发体验        |
| **Tailwind CSS** | 4.x  | 样式框架 | 原子化，AI 友好           |
| **ShadcnUI**     | 1.x  | 组件库   | 可复制，完全可控          |

### 2.2 协同技术

| 技术            | 版本 | 用途               | 选型理由           |
| --------------- | ---- | ------------------ | ------------------ |
| **Tiptap**      | 3.x  | 富文本编辑器       | 无头设计，Yjs 集成 |
| **Yjs**         | 13.x | CRDT 引擎          | 工业级，性能优秀   |
| **y-websocket** | 2.x  | WebSocket Provider | 官方推荐           |
| **y-indexeddb** | 9.x  | 本地持久化         | 离线支持           |

### 2.3 状态管理

| 技术               | 版本 | 用途       | 选型理由          |
| ------------------ | ---- | ---------- | ----------------- |
| **Zustand**        | 5.x  | 客户端状态 | 轻量，无 Provider |
| **TanStack Query** | 5.x  | 服务端状态 | 缓存，自动刷新    |
| **Immer**          | 10.x | 不可变更新 | 简化状态更新      |

### 2.4 工具链

| 技术           | 用途             |
| -------------- | ---------------- |
| **pnpm**       | 包管理           |
| **Turbopack**  | 构建工具（开发） |
| **Vitest**     | 单元测试         |
| **Playwright** | E2E 测试         |
| **ESLint**     | 代码检查         |
| **Prettier**   | 代码格式化       |

---

## 2.5 组件使用优先级

### 优先级规则

```
1. shadcn/UI 组件 → 最高优先级（components/ui/）
2. 项目自定义组件 → 次优先级
   - components/common/ 通用组件
   - components/editor/ 编辑器组件
   - components/collaboration/ 协同组件
3. 第三方组件库 → 最后选择（需说明原因）
4. 新建自定义组件 → 需要确认
```

### 组件选择流程

```
开始
  │
  ▼
┌──────────────────┐
│ shadcn/UI 是否   │──是──▶ 使用 shadcn/UI 组件
│ 满足需求？       │
└────────┬─────────┘
         │否
         ▼
┌──────────────────┐
│ 项目组件是否     │──是──▶ 使用项目组件
│ 满足需求？       │
└────────┬─────────┘
         │否
         ▼
┌──────────────────┐
│ 第三方库是否     │──是──▶ 使用第三方（需说明原因）
│ 满足需求？       │
└────────┬─────────┘
         │否
         ▼
┌──────────────────┐
│ 申请新建组件     │
│ （需用户确认）   │
└──────────────────┘
```

---

## 2.6 单文件行数限制

| 文件类型                   | 推荐行数 | 最大行数 | 说明                          |
| -------------------------- | -------- | -------- | ----------------------------- |
| 页面组件                   | 200-300  | 400      | `app/**/page.tsx`             |
| UI 组件                    | 100-200  | 300      | `components/ui/*.tsx`         |
| Hook 文件                  | 100-200  | 300      | `hooks/*.ts`                  |
| 工具函数                   | 50-150   | 200      | `lib/**/*.ts`                 |
| **例外**（编辑器核心配置） | 300-500  | 800      | `lib/editor/extensions.ts` 等 |

### 通用限制

| 限制项         | 值    | 说明             |
| -------------- | ----- | ---------------- |
| 单函数最大行数 | 50 行 | 超过需要拆分     |
| 嵌套层级       | 4 层  | 超过需要重构     |
| 参数数量       | 4 个  | 超过使用对象封装 |

> 详细规范请参阅 [AI Agent 开发指南](../01-architecture/ai-agent-guidelines.md)。

### 2.6 主题系统

项目使用 CSS 变量和 next-themes 实现主题切换：

```css
/* globals.css */
:root {
  /* 表面颜色 */
  --surface: #ffffff;
  --surface-hover: #f3f4f6;
  --sidebar-bg: #fafafa;

  /* 语义化颜色 */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;

  /* Claude 橙色强调 */
  --primary: 30 100% 50%;
  --primary-foreground: 210 40% 98%;

  /* 其他变量 */
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 30 100% 50%;
}

.dark {
  --surface: #1a1a1a;
  --surface-hover: #2a2a2a;
  --sidebar-bg: #1f1f1f;
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}
```

### 2.7 字体配置

```typescript
// layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const jetbrains = JetBrains_Mono({ subsets: ['latin'] });

export const metadata = {
  title: 'Collab Editor',
  description: '实时协同文档编辑器',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" className={`${inter.className} ${jetbrains.className}`}>
      <body className="font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
```

---

## 3. 目录结构

```
frontend/
├── app/                        # Next.js App Router
│   ├── (auth)/                # 认证路由组
│   │   ├── login/
│   │   │   └── page.tsx       # 登录页
│   │   ├── register/
│   │   │   └── page.tsx       # 注册页
│   │   └── layout.tsx         # 认证布局
│   │
│   ├── (main)/                # 主应用路由组
│   │   ├── page.tsx           # 首页/仪表盘
│   │   ├── documents/
│   │   │   ├── page.tsx       # 文档列表
│   │   │   └── [id]/
│   │   │       ├── page.tsx   # 文档编辑
│   │   │       └── versions/
│   │   │           └── page.tsx # 版本历史
│   │   ├── settings/
│   │   │   └── page.tsx       # 用户设置
│   │   └── layout.tsx         # 主应用布局
│   │
│   ├── api/                   # API Routes (BFF)
│   │   └── trpc/
│   │       └── [trpc]/
│   │
│   ├── layout.tsx             # 根布局
│   ├── page.tsx               # 落地页
│   ├── globals.css            # 全局样式
│   └── not-found.tsx          # 404 页面
│
├── components/                 # React 组件
│   ├── ui/                    # ShadcnUI 基础组件
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   │
│   ├── editor/                # 编辑器组件
│   │   ├── index.ts           # 统一导出
│   │   ├── editor.tsx         # 主编辑器
│   │   ├── menu-bar.tsx       # 菜单栏
│   │   ├── bubble-menu.tsx    # 浮动菜单
│   │   ├── status-bar.tsx     # 状态栏
│   │   ├── extensions/        # 自定义扩展
│   │   │   ├── index.ts
│   │   │   ├── highlight.tsx
│   │   │   └── placeholder.tsx
│   │   └── styles/
│   │       └── editor.css
│   │
│   ├── collaboration/         # 协同组件
│   │   ├── index.ts
│   │   ├── collaboration-cursor.tsx
│   │   ├── awareness-panel.tsx
│   │   ├── collaborator-avatars.tsx
│   │   └── connection-status.tsx
│   │
│   ├── version/               # 版本管理组件
│   │   ├── index.ts
│   │   ├── version-list.tsx
│   │   ├── version-preview.tsx
│   │   ├── version-diff.tsx
│   │   └── version-timeline.tsx
│   │
│   ├── document/              # 文档组件
│   │   ├── index.ts
│   │   ├── document-card.tsx
│   │   ├── document-list.tsx
│   │   └── document-header.tsx
│   │
│   └── common/                # 通用组件
│       ├── index.ts
│       ├── header.tsx
│       ├── sidebar.tsx
│       ├── loading.tsx
│       ├── error-boundary.tsx
│       ├── skeleton.tsx
│       └── empty-state.tsx
│
├── hooks/                      # 自定义 Hooks
│   ├── index.ts
│   ├── use-document.ts        # 文档操作
│   ├── use-collaboration.ts   # 协同状态
│   ├── use-versions.ts        # 版本管理
│   ├── use-auth.ts            # 认证状态
│   ├── use-websocket.ts       # WebSocket 连接
│   ├── use-awareness.ts       # Awareness 状态
│   ├── use-offline.ts         # 离线检测
│   └── use-prefetch.ts        # 预加载
│
├── lib/                        # 工具函数
│   ├── api/                   # API 客户端
│   │   ├── client.ts          # Axios 实例
│   │   ├── endpoints.ts       # 端点定义
│   │   └── errors.ts          # 错误处理
│   │
│   ├── auth/                  # 认证工具
│   │   ├── token.ts           # Token 管理
│   │   ├── session.ts         # 会话管理
│   │   └── guards.ts          # 路由守卫
│   │
│   ├── yjs/                   # Yjs 工具
│   │   ├── provider.ts        # Provider 创建
│   │   ├── awareness.ts       # Awareness 工具
│   │   ├── sync.ts            # 同步工具
│   │   ├── persistence.ts     # 持久化
│   │   └── offline-queue.ts   # 离线队列
│   │
│   ├── editor/                # 编辑器工具
│   │   ├── extensions.ts      # 扩展配置
│   │   └── shortcuts.ts       # 快捷键
│   │
│   ├── utils.ts               # 通用工具
│   ├── constants.ts           # 常量定义
│   └── validations.ts         # Zod Schema
│
├── providers/                  # Context Providers
│   ├── index.ts
│   ├── app-provider.tsx       # 应用级 Provider
│   ├── auth-provider.tsx      # 认证 Provider
│   ├── query-provider.tsx     # TanStack Query
│   ├── theme-provider.tsx     # 主题 Provider
│   └── editor-provider.tsx    # 编辑器 Provider
│
├── stores/                     # Zustand Stores
│   ├── index.ts
│   ├── document-store.ts      # 文档状态
│   ├── ui-store.ts            # UI 状态
│   └── user-store.ts          # 用户状态
│
├── types/                      # TypeScript 类型
│   ├── index.ts
│   ├── api.ts                 # API 类型
│   ├── document.ts            # 文档类型
│   ├── user.ts                # 用户类型
│   ├── version.ts             # 版本类型
│   └── editor.ts              # 编辑器类型
│
├── styles/                     # 样式文件
│   ├── globals.css            # 全局样式
│   └── editor.css             # 编辑器样式
│
├── public/                     # 静态资源
│   ├── icons/
│   └── images/
│
├── .env.local                  # 本地环境变量
├── .env.example                # 环境变量示例
├── next.config.ts              # Next.js 配置
├── tailwind.config.ts          # Tailwind 配置
├── tsconfig.json               # TypeScript 配置
├── package.json                # 项目依赖
└── pnpm-lock.yaml              # 锁定文件
```

---

## 4. 核心模块设计

### 4.1 模块划分

```
┌─────────────────────────────────────────────────────────────────┐
│                      前端核心模块                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ 认证模块    │  │ 文档模块    │  │ 编辑器模块  │            │
│  │ AuthModule  │  │ DocModule   │  │ EditorModule│            │
│  │             │  │             │  │             │            │
│  │ 登录/注册   │  │ 列表/详情   │  │ Tiptap     │            │
│  │ Token 管理  │  │ CRUD 操作   │  │ 扩展管理   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ 协同模块    │  │ 版本模块    │  │ 设置模块    │            │
│  │ CollabModule│  │VersionModule│  │SettingsModule│           │
│  │             │  │             │  │             │            │
│  │ Yjs Provider│  │ 快照列表    │  │ 个人资料    │            │
│  │ Awareness   │  │ 恢复/Diff   │  │ 偏好设置    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 模块职责

| 模块           | 职责                       | 核心文件                                         |
| -------------- | -------------------------- | ------------------------------------------------ |
| **认证模块**   | 用户登录、注册、Token 管理 | `hooks/use-auth.ts`, `lib/auth/*`                |
| **文档模块**   | 文档列表、详情、CRUD       | `hooks/use-document.ts`, `components/document/*` |
| **编辑器模块** | Tiptap 配置、扩展、样式    | `components/editor/*`, `lib/editor/*`            |
| **协同模块**   | Yjs Provider、Awareness    | `lib/yjs/*`, `components/collaboration/*`        |
| **版本模块**   | 版本列表、预览、恢复       | `hooks/use-versions.ts`, `components/version/*`  |
| **设置模块**   | 用户设置、偏好配置         | `app/(main)/settings/*`                          |

---

## 5. 状态管理架构

### 5.1 状态分类

```
┌─────────────────────────────────────────────────────────────────┐
│                      状态管理架构                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    服务端状态                             │   │
│  │                   (TanStack Query)                       │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐           │   │
│  │  │ Documents │  │ Versions  │  │   User    │           │   │
│  │  │   列表    │  │   列表    │  │   资料    │           │   │
│  │  └───────────┘  └───────────┘  └───────────┘           │   │
│  │  特点：自动缓存、后台刷新、重试机制                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    客户端状态                             │   │
│  │                     (Zustand)                            │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐           │   │
│  │  │    UI     │  │   Auth    │  │  Editor   │           │   │
│  │  │  侧边栏   │  │  会话     │  │  工具栏   │           │   │
│  │  └───────────┘  └───────────┘  └───────────┘           │   │
│  │  特点：同步更新、持久化可选、无 Provider                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    协同状态                               │   │
│  │                    (Yjs + Y.Doc)                         │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐           │   │
│  │  │  Y.Text   │  │  Y.Map    │  │ Awareness │           │   │
│  │  │  内容     │  │  元数据   │  │  光标     │           │   │
│  │  └───────────┘  └───────────┘  └───────────┘           │   │
│  │  特点：CRDT 合并、自动同步、离线支持                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Zustand Store 设计

```typescript
// stores/document-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface DocumentState {
  // 状态
  activeDocumentId: string | null;
  recentDocuments: string[];
  isSidebarOpen: boolean;

  // 操作
  setActiveDocument: (id: string | null) => void;
  addToRecent: (id: string) => void;
  toggleSidebar: () => void;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      activeDocumentId: null,
      recentDocuments: [],
      isSidebarOpen: true,

      setActiveDocument: (id) => set({ activeDocumentId: id }),

      addToRecent: (id) => {
        const recent = get().recentDocuments.filter((d) => d !== id);
        set({ recentDocuments: [id, ...recent].slice(0, 10) });
      },

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    }),
    {
      name: 'document-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        recentDocuments: state.recentDocuments,
        isSidebarOpen: state.isSidebarOpen,
      }),
    }
  )
);
```

### 5.3 TanStack Query 配置

```typescript
// hooks/use-document.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';

// 查询键工厂
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...documentKeys.lists(), { filters }] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
};

// 文档列表查询
export function useDocuments(page = 1, limit = 20) {
  return useQuery({
    queryKey: documentKeys.list({ page, limit }),
    queryFn: () => api.get('/documents', { params: { page, limit } }),
    staleTime: 30 * 1000, // 30 秒
  });
}

// 文档详情查询
export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => api.get(`/documents/${id}`),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 分钟
  });
}

// 文档创建
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { title: string }) => api.post('/documents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}
```

---

## 6. 数据流设计

### 6.1 编辑数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          编辑数据流                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  用户输入                                                                │
│     │                                                                   │
│     ▼                                                                   │
│  ┌──────────┐                                                           │
│  │ Keyboard │  键盘事件                                                 │
│  │  Event   │                                                           │
│  └────┬─────┘                                                           │
│       │                                                                 │
│       ▼                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌─────────────┐                      │
│  │  Tiptap  │───▶│  Y.Doc   │───▶│  Observer   │                      │
│  │  Editor  │    │ (本地状态)│    │   Callback  │                      │
│  └──────────┘    └──────────┘    └─────────────┘                      │
│       │               │                                                 │
│       │               │                                                 │
│       │               ▼                                                 │
│       │         ┌──────────┐    ┌─────────────┐    ┌──────────┐       │
│       │         │ WebSocket│───▶│ Hocuspocus  │───▶│PostgreSQL│       │
│       │         │ Provider │    │   Server    │    │ (持久化) │       │
│       │         └──────────┘    └─────────────┘    └──────────┘       │
│       │               │                           │                    │
│       │               │                           │                    │
│       │               ▼                           │                    │
│       │         ┌──────────┐                      │                    │
│       │         │ IndexedDB│  (离线存储)          │                    │
│       │         └──────────┘                      │                    │
│       │                                           │                    │
│       └───────────────────────────────────────────┘                    │
│                      UI 更新（通过 Yjs 观察者）                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 认证数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          认证数据流                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐                                                           │
│  │ 登录表单 │                                                           │
│  │ 提交     │                                                           │
│  └────┬─────┘                                                           │
│       │                                                                 │
│       ▼                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌─────────────┐                      │
│  │  React   │───▶│   API    │───▶│   NestJS    │                      │
│  │  Hook    │    │  Client  │    │  Auth API   │                      │
│  └──────────┘    └──────────┘    └─────────────┘                      │
│                                           │                             │
│                                           ▼                             │
│                                    ┌──────────┐                        │
│                                    │ JWT Token│                        │
│                                    │  生成    │                        │
│                                    └────┬─────┘                        │
│                                         │                               │
│       ┌─────────────────────────────────┘                               │
│       │                                                                 │
│       ▼                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌─────────────┐                      │
│  │  Token   │───▶│  Zustand │───▶│ localStorage│                      │
│  │  存储    │    │  Store   │    │   持久化    │                      │
│  └──────────┘    └──────────┘    └─────────────┘                      │
│       │                                                                 │
│       ▼                                                                 │
│  ┌──────────┐                                                           │
│  │  路由    │                                                           │
│  │  跳转    │                                                           │
│  └──────────┘                                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.3 离线同步流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          离线同步流程                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐                    ┌──────────────────┐          │
│  │     在线状态      │                    │     离线状态      │          │
│  │                  │                    │                  │          │
│  │  实时同步到服务端 │                    │  编辑继续工作    │          │
│  │                  │                    │  更新存入 IndexedDB│         │
│  └────────┬─────────┘                    └────────┬─────────┘          │
│           │                                       │                     │
│           │         ┌──────────────┐              │                     │
│           └────────▶│  网络状态检测 │◀─────────────┘                     │
│                     │              │                                    │
│                     └──────┬───────┘                                    │
│                            │                                             │
│                            ▼                                             │
│                     ┌──────────────┐                                    │
│                     │   重连成功    │                                    │
│                     └──────┬───────┘                                    │
│                            │                                             │
│                            ▼                                             │
│                     ┌──────────────┐                                    │
│                     │  同步离线更新  │                                    │
│                     │  到服务端     │                                    │
│                     └──────────────┘                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. 组件层次结构

### 7.1 页面组件树

```
App (Root Layout)
│
├── AuthProvider
│   └── QueryProvider
│       └── ThemeProvider          # 新增主题提供者
│           │
│           ├── (auth) Layout
│           │   ├── Login Page
│           │   │   └── LoginForm
│           │   └── Register Page
│           │       └── RegisterForm
│           │
│           └── (main) Layout
│               ├── Header
│               │   ├── Logo
│               │   ├── Navigation
│               │   ├── SearchBox
│               │   └── UserMenu
│               │
│               ├── Sidebar (可选)
│               │   ├── DocumentList
│               │   └── QuickActions
│               │
│               └── Main Content
│                   │
│                   ├── Documents Page
│                   │   ├── DocumentGrid
│                   │   │   └── DocumentCard[]
│                   │   └── CreateDocumentButton
│                   │
│                   └── Document [id] Page
│                       ├── DocumentHeader
│                       │   ├── DocumentTitle
│                       │   ├── ShareButton
│                       │   └── CollaboratorAvatars
│                       │
│                       ├── EditorProvider
│                       │   └── DocumentEditor
│                       │       ├── MenuBar
│                       │       ├── EditorContent
│                       │       └── StatusBar
│                       │
│                       └── VersionPanel (可选)
│                           ├── VersionList
│                           └── VersionPreview
```

### 7.2 主题系统架构

```typescript
// providers/theme-provider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
```

### 7.3 错误处理和加载状态

```typescript
// error.tsx
export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">出错了</h1>
        <p>抱歉，发生了错误。</p>
      </div>
    </div>
  );
}

// not-found.tsx
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">页面未找到</h1>
        <p>抱歉，您访问的页面不存在。</p>
      </div>
    </div>
  );
}

// loading.tsx
export default function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  );
}
```

### 7.2 编辑器组件树

```
DocumentEditor
│
├── CollaborationProvider
│   ├── Y.Doc (Context)
│   └── WebsocketProvider
│
├── MenuBar
│   ├── ButtonGroup (格式化)
│   │   ├── BoldButton
│   │   ├── ItalicButton
│   │   ├── StrikeButton
│   │   └── CodeButton
│   │
│   ├── ButtonGroup (列表)
│   │   ├── BulletListButton
│   │   ├── OrderedListButton
│   │   └── QuoteButton
│   │
│   └── ButtonGroup (历史)
│       ├── UndoButton
│       └── RedoButton
│
├── EditorContent
│   └── Tiptap Editor
│       ├── Paragraph Nodes
│       ├── Heading Nodes
│       ├── List Nodes
│       └── Collaboration Cursors
│           └── Cursor Overlay
│
├── BubbleMenu (选中文本时显示)
│   ├── FormatButtons
│   └── LinkInput
│
└── StatusBar
    ├── ConnectionIndicator
    ├── SyncStatus
    ├── CollaboratorAvatars
    └── WordCount
```

---

## 8. 编辑器架构

### 8.1 Tiptap 扩展配置

```typescript
// lib/editor/extensions.ts
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import * as Y from 'yjs';

import { CustomHighlight } from './custom-highlight';
import { CustomPlaceholder } from './custom-placeholder';

interface EditorExtensionsConfig {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  user: { id: string; name: string; color: string };
}

export function createEditorExtensions(config: EditorExtensionsConfig) {
  const { ydoc, provider, user } = config;

  return [
    // 基础扩展
    StarterKit.configure({
      history: false, // 禁用本地历史，使用 Yjs
      heading: { levels: [1, 2, 3] },
    }),

    // 协同扩展
    Collaboration.configure({
      document: ydoc,
      field: 'content',
    }),

    CollaborationCursor.configure({
      provider,
      user,
      render: (user) => {
        const cursor = document.createElement('span');
        cursor.classList.add('collaboration-cursor__caret');
        cursor.style.borderColor = user.color;

        const label = document.createElement('span');
        label.classList.add('collaboration-cursor__label');
        label.style.backgroundColor = user.color;
        label.textContent = user.name;
        cursor.appendChild(label);

        return cursor;
      },
    }),

    // 功能扩展
    Underline,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Typography,

    // 自定义扩展
    CustomPlaceholder.configure({ placeholder: '开始输入...' }),
    CustomHighlight,
  ];
}
```

### 8.2 编辑器 Hook

```typescript
// hooks/use-editor.ts
import { useEditor, Editor } from '@tiptap/react';
import { useMemo, useCallback } from 'react';
import { createEditorExtensions } from '@/lib/editor/extensions';

interface UseDocumentEditorOptions {
  documentId: string;
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  user: UserInfo;
  onUpdate?: (editor: Editor) => void;
}

export function useDocumentEditor(options: UseDocumentEditorOptions) {
  const { ydoc, provider, user, onUpdate } = options;

  // 创建扩展配置
  const extensions = useMemo(
    () => createEditorExtensions({ ydoc, provider, user }),
    [ydoc, provider, user]
  );

  // 创建编辑器实例
  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg focus:outline-none max-w-full min-h-[500px] p-4',
      },
      handleKeyDown: (view, event) => {
        // 自定义快捷键处理
        if ((event.metaKey || event.ctrlKey) && event.key === 's') {
          event.preventDefault();
          // 触发保存版本
          return true;
        }
        return false;
      },
    },
  });

  // 焦点管理
  const focus = useCallback(() => {
    editor?.commands.focus();
  }, [editor]);

  // 获取内容
  const getContent = useCallback(() => {
    return {
      html: editor?.getHTML() || '',
      json: editor?.getJSON() || null,
      text: editor?.getText() || '',
    };
  }, [editor]);

  return {
    editor,
    focus,
    getContent,
  };
}
```

---

## 9. 协同客户端架构

### 9.1 Yjs Provider 管理

```typescript
// lib/yjs/provider-manager.ts
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

interface ProviderManagerConfig {
  documentId: string;
  token: string;
  wsUrl: string;
}

interface ProviderManager {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  persistence: IndexeddbPersistence;
  destroy: () => void;
}

export function createProviderManager(config: ProviderManagerConfig): ProviderManager {
  const { documentId, token, wsUrl } = config;

  // 1. 创建 Yjs 文档
  const ydoc = new Y.Doc();

  // 2. 创建 WebSocket Provider
  const provider = new WebsocketProvider(wsUrl, documentId, ydoc, {
    connect: false, // 延迟连接
    params: { token },
  });

  // 3. 创建 IndexedDB 持久化
  const persistence = new IndexeddbPersistence(documentId, ydoc);

  // 4. 设置重连策略
  setupReconnectStrategy(provider);

  // 5. 连接
  provider.connect();

  // 返回管理器
  return {
    ydoc,
    provider,
    persistence,
    destroy: () => {
      provider.disconnect();
      provider.destroy();
      persistence.destroy();
      ydoc.destroy();
    },
  };
}

// 重连策略
function setupReconnectStrategy(provider: WebsocketProvider) {
  let retryCount = 0;
  const maxRetries = 10;
  const baseDelay = 1000;
  const maxDelay = 30000;

  const reconnect = () => {
    if (retryCount >= maxRetries) return;

    const delay = Math.min(baseDelay * Math.pow(1.5, retryCount), maxDelay);

    retryCount++;
    setTimeout(() => provider.connect(), delay);
  };

  provider.on('connection-close', reconnect);
  provider.on('status', ({ status }) => {
    if (status === 'connected') retryCount = 0;
  });
}
```

### 9.2 Awareness 管理

```typescript
// hooks/use-awareness.ts
import { useEffect, useState, useCallback } from 'react';
import { Awareness } from 'y-protocols/awareness';

interface UserAwareness {
  clientId: number;
  userId: string;
  name: string;
  color: string;
  cursor?: { from: number; to: number };
  selection?: { from: number; to: number };
  isEditing: boolean;
}

export function useAwareness(awareness: Awareness | null) {
  const [users, setUsers] = useState<UserAwareness[]>([]);
  const [localState, setLocalState] = useState<Partial<UserAwareness>>({});

  // 监听远程状态变化
  useEffect(() => {
    if (!awareness) return;

    const updateUsers = () => {
      const states = Array.from(awareness.getStates().entries());
      const userStates = states
        .filter(([clientId]) => clientId !== awareness.clientID)
        .map(([clientId, state]) => ({
          clientId,
          ...state,
        })) as UserAwareness[];

      setUsers(userStates);
    };

    updateUsers();
    awareness.on('change', updateUsers);

    return () => awareness.off('change', updateUsers);
  }, [awareness]);

  // 更新本地状态
  const updateLocalState = useCallback(
    (state: Partial<UserAwareness>) => {
      if (!awareness) return;

      awareness.setLocalStateField('user', {
        ...localState,
        ...state,
      });

      setLocalState((prev) => ({ ...prev, ...state }));
    },
    [awareness, localState]
  );

  // 更新光标位置
  const updateCursor = useCallback(
    (cursor: { from: number; to: number } | null) => {
      updateLocalState({ cursor });
    },
    [updateLocalState]
  );

  // 更新编辑状态
  const setEditing = useCallback(
    (isEditing: boolean) => {
      updateLocalState({ isEditing });
    },
    [updateLocalState]
  );

  return {
    users,
    localState,
    updateCursor,
    setEditing,
    updateLocalState,
  };
}
```

---

## 10. 性能优化策略

### 10.1 代码分割

```typescript
// 动态导入编辑器
import dynamic from 'next/dynamic';

const DocumentEditor = dynamic(
  () => import('@/components/editor/editor'),
  {
    loading: () => <EditorSkeleton />,
    ssr: false,
  }
);

// 条件导入版本面板
const VersionPanel = dynamic(
  () => import('@/components/version/version-panel'),
  {
    loading: () => <PanelSkeleton />,
  }
);
```

### 10.2 缓存策略

```typescript
// TanStack Query 缓存配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 分钟
      gcTime: 5 * 60 * 1000, // 5 分钟
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 预加载策略
function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchDocument = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: documentKeys.detail(id),
      queryFn: () => api.get(`/documents/${id}`),
    });
  };

  return { prefetchDocument };
}
```

### 10.3 虚拟列表

```typescript
// 版本列表虚拟化
import { useVirtualizer } from '@tanstack/react-virtual';

function VersionList({ versions }: { versions: Version[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: versions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => (
          <VersionItem
            key={item.key}
            version={versions[item.index]}
            style={{ transform: `translateY(${item.start}px)` }}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 11. 错误处理架构

### 11.1 错误边界

```typescript
// components/common/error-boundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    // 上报错误
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### 11.2 API 错误处理

```typescript
// lib/api/errors.ts
import { AxiosError } from 'axios';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function handleApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const response = error.response?.data;
    return new ApiError(
      response?.error?.code || 'UNKNOWN_ERROR',
      response?.error?.message || error.message,
      error.response?.status || 500,
      response?.error?.details
    );
  }

  if (error instanceof Error) {
    return new ApiError('UNKNOWN_ERROR', error.message, 500);
  }

  return new ApiError('UNKNOWN_ERROR', 'Unknown error', 500);
}
```

---

## 12. 安全设计

### 12.1 Token 管理

```typescript
// lib/auth/token.ts
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const tokenManager = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),

  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  isTokenExpired: (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  },
};
```

### 12.2 XSS 防护

```typescript
// 使用 DOMPurify 清理用户输入
import DOMPurify from 'dompurify';

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'code',
      'pre',
      'ul',
      'ol',
      'li',
      'blockquote',
      'h1',
      'h2',
      'h3',
    ],
    ALLOWED_ATTR: ['class', 'data-color'],
  });
}
```

---

## 相关文档

- [工程化结构](./project-structure.md)
- [Tiptap 编辑器集成](./tiptap-integration.md)
- [Yjs 客户端配置](./yjs-client.md)
- [错误处理与边界](./error-handling.md)
- [性能优化策略](./performance.md)
- [系统架构](../01-architecture/README.md)
- [协同核心](../05-collaboration/README.md)
