# 前端开发文档

## 概述

本文档描述协同文档编辑系统的前端架构，基于 **Next.js 15** App Router 构建，集成 **Tiptap 3** 编辑器和 **Yjs** 协同引擎。

## 技术栈

| 技术           | 版本 | 用途          |
| -------------- | ---- | ------------- |
| Next.js        | 15+  | 全栈框架      |
| React          | 19+  | UI 库         |
| Tiptap         | 3.x  | 富文本编辑器  |
| Yjs            | 13.x | CRDT 协同引擎 |
| Tailwind CSS   | 4.x  | 样式框架      |
| ShadcnUI       | 1.x  | UI 组件库     |
| Zustand        | 5.x  | 状态管理      |
| TanStack Query | 5.x  | 服务端状态    |

## 文档目录

| 文档                                             | 说明                 |
| ------------------------------------------------ | -------------------- |
| [architecture.md](./architecture.md)             | **前端架构详细设计** |
| [project-structure.md](./project-structure.md)   | 工程化结构           |
| [tiptap-integration.md](./tiptap-integration.md) | Tiptap 编辑器集成    |
| [yjs-client.md](./yjs-client.md)                 | Yjs 客户端配置       |
| [error-handling.md](./error-handling.md)         | 错误处理与边界       |
| [performance.md](./performance.md)               | 性能优化策略         |

## 项目结构

```
frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 认证相关页面
│   │   ├── login/
│   │   └── register/
│   ├── (main)/            # 主应用页面
│   │   ├── documents/
│   │   └── settings/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/            # React 组件
│   ├── ui/               # ShadcnUI 组件
│   ├── editor/           # 编辑器组件
│   ├── collaboration/    # 协同相关组件
│   └── common/           # 通用组件
│
├── hooks/                 # 自定义 Hooks
├── lib/                   # 工具函数
├── providers/             # Context Providers
├── stores/                # Zustand Stores
├── types/                 # TypeScript 类型
└── styles/                # 全局样式
```

## 核心功能模块

### 1. 编辑器模块

- Tiptap 编辑器初始化
- 协同扩展集成
- 自定义扩展
- 菜单栏与工具栏

### 2. 协同模块

- Yjs Provider 配置
- Awareness 状态管理
- 离线支持
- 冲突处理

### 3. 版本管理模块

- 版本列表展示
- 版本预览
- 版本恢复
- Diff 对比

## 设计原则

### 1. 本地优先

客户端持有完整状态，优先在本地执行操作，异步同步到服务端。

### 2. 组件化

采用原子设计模式，从基础组件到页面组件逐层组合。

### 3. 类型安全

全面使用 TypeScript，确保类型安全。

### 4. 性能优先

- 代码分割
- 虚拟列表
- 懒加载
- 缓存策略

## 相关文档

- [系统架构](../01-architecture/README.md)
- [协同核心](../05-collaboration/README.md)
- [后端开发](../04-backend/README.md)
