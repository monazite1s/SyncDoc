# 技术栈选型（2026 视角）

## 技术栈总览

| 层级           | 技术                      | 版本                   | 选型理由                 |
| -------------- | ------------------------- | ---------------------- | ------------------------ |
| **前端框架**   | Next.js 15+               | App Router + Turbopack | RSC 成熟，性能优化完善   |
| **UI 组件**    | Tailwind CSS 4 + ShadcnUI | 最新稳定版             | 现代化，AI 生成友好      |
| **编辑器内核** | Tiptap 3.x                | ProseMirror            | 无头编辑器，Yjs 深度集成 |
| **协同引擎**   | Yjs + y-websocket         | 最新稳定版             | CRDT YATA 算法，工业级   |
| **后端框架**   | NestJS 11+                | 最新 LTS               | 模块化，TypeScript 原生  |
| **协同中继**   | Hocuspocus 3.x            | Tiptap 官方            | 钩子式开发，易扩展       |
| **ORM**        | Prisma 6+                 | 最新稳定版             | 类型安全，迁移完善       |
| **主存储**     | PostgreSQL 17             | 最新 LTS               | BYTEA 支持，JSONB 优化   |
| **缓存/消息**  | Redis 8+                  | 最新稳定版             | Pub/Sub，分布式锁        |
| **运行时**     | Node.js 22 LTS            | 或 Bun 2.x             | 性能优化，原生 TS        |

## 前端技术栈详解

### 主题和字体

```json
{
    "dependencies": {
        "next-themes": "^0.3.0"
    }
}
```

**功能：**

1. **主题切换**：支持 dark/light 模式，跟随系统设置
2. **CSS 变量**：语义化颜色定义，支持动态切换
3. **客户端渲染**：避免服务端渲染主题闪烁

### 类型共享

使用 workspace 共享前后端类型：

```json
{
    "dependencies": {
        "@collab/types": "workspace:*"
    }
}
```

**优势：**

1. **类型安全**：前后端使用相同的 TypeScript 类型
2. **自动同步**：修改类型后自动在所有地方生效
3. **代码生成**：基于 OpenAPI 生成类型定义

## 前端技术栈详解

### Next.js 15+

```json
{
    "dependencies": {
        "next": "^15.0.0",
        "react": "^19.0.0",
        "react-dom": "^19.0.0"
    }
}
```

**选型理由：**

1. **App Router 成熟**：基于 React Server Components，支持流式渲染
2. **Turbopack 稳定**：比 Webpack 快 10 倍的构建速度
3. **API Routes**：内置 BFF 层，简化后端交互
4. **Edge Runtime**：支持全球边缘部署

### Tiptap 3.x

```json
{
    "dependencies": {
        "@tiptap/react": "^3.0.0",
        "@tiptap/starter-kit": "^3.0.0",
        "@tiptap/extension-collaboration": "^3.0.0",
        "@tiptap/extension-collaboration-cursor": "^3.0.0",
        "yjs": "^13.6.0"
    }
}
```

**选型理由：**

1. **无头设计**：完全控制 UI，无样式污染
2. **ProseMirror 基础**：成熟的内容编辑模型
3. **Yjs 原生集成**：Collaboration 扩展开箱即用
4. **扩展生态**：丰富的官方扩展

### Tailwind CSS 4 + ShadcnUI

```json
{
    "dependencies": {
        "tailwindcss": "^4.0.0",
        "@shadcn/ui": "^1.0.0",
        "class-variance-authority": "^0.7.0",
        "clsx": "^2.0.0",
        "tailwind-merge": "^2.0.0"
    }
}
```

**选型理由：**

1. **原子化 CSS**：高性能，无样式冲突
2. **ShadcnUI**：可复制组件，完全可控
3. **AI 友好**：易于通过 AI 生成和修改

## 后端技术栈详解

### NestJS 11+

```json
{
    "dependencies": {
        "@nestjs/core": "^11.0.0",
        "@nestjs/common": "^11.0.0",
        "@nestjs/platform-express": "^11.0.0",
        "@nestjs/jwt": "^11.0.0",
        "@nestjs/passport": "^11.0.0",
        "@nestjs/websockets": "^11.0.0"
    }
}
```

**选型理由：**

1. **模块化架构**：清晰的依赖注入和模块边界
2. **TypeScript 原生**：类型安全，开发体验好
3. **装饰器模式**：代码简洁，易于理解
4. **生态丰富**：集成 Passport、Swagger 等

### Hocuspocus 3.x

```json
{
    "dependencies": {
        "@hocuspocus/server": "^3.0.0",
        "@hocuspocus/extension-database": "^3.0.0",
        "@hocuspocus/extension-redis": "^3.0.0",
        "@hocuspocus/extension-monitor": "^3.0.0"
    }
}
```

**选型理由：**

1. **Tiptap 官方**：与编辑器生态无缝集成
2. **钩子式架构**：灵活的生命周期控制
3. **水平扩展**：通过 Redis 实现多实例
4. **成熟稳定**：生产环境验证

### Prisma 6+

```json
{
    "dependencies": {
        "@prisma/client": "^6.0.0"
    },
    "devDependencies": {
        "prisma": "^6.0.0"
    }
}
```

**选型理由：**

1. **类型安全**：自动生成 TypeScript 类型
2. **迁移系统**：版本化的数据库变更
3. **查询优化**：自动 JOIN，N+1 问题警告
4. **多数据库支持**：PostgreSQL、MySQL 等

## 数据存储技术栈

### PostgreSQL 17

**选型理由：**

1. **BYTEA 类型**：高效存储 Yjs 二进制数据
2. **JSONB 索引**：元数据查询优化
3. **事务支持**：ACID 保证
4. **成熟稳定**：企业级可靠性

### Redis 8+

**选型理由：**

1. **Pub/Sub**：跨实例消息广播
2. **分布式锁**：版本创建防重
3. **会话缓存**：JWT 黑名单
4. **限流**：API 访问控制

## 开发工具链

### 包管理器

```bash
# pnpm（推荐）
pnpm install

# 或 bun
bun install
```

### 代码质量

```json
{
    "devDependencies": {
        "typescript": "^5.5.0",
        "eslint": "^9.0.0",
        "prettier": "^3.0.0",
        "@typescript-eslint/eslint-plugin": "^8.0.0",
        "vitest": "^2.0.0"
    }
}
```

### 构建工具

- **前端**：Turbopack（Next.js 内置）
- **后端**：esbuild / tsx

## 版本兼容性矩阵

| 组件          | 最低版本     | 推荐版本 | 说明      |
| ------------- | ------------ | -------- | --------- |
| Node.js       | 20.x         | 22 LTS   | 运行时    |
| pnpm          | 8.x          | 9.x      | 包管理    |
| PostgreSQL    | 15           | 17       | 主数据库  |
| Redis         | 7.x          | 8.x      | 缓存/消息 |
| next-themes   | ^0.3.0       | 最新     | 主题切换  |
| @collab/types | workspace:\* | -        | 类型共享  |

## 相关文档

- [整体架构设计](./system-architecture.md)
- [后端模块设计](../04-backend/nestjs-modules.md)
- [部署配置](../06-deployment/README.md)
