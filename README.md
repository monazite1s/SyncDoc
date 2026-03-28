# Collab Editor

> **Real-time Collaborative Document Editor**
>
> 基于 CRDT 的实时多人协同文档编辑器，集成类 Git 版本管理与可视化差异比对。专为独立全栈开发者设计，采用 Vibe Coding（AI 辅助开发）理念。

---

## 目录

- [核心能力](#核心能力)
- [快速开始](#快速开始)
- [技术栈总览](#技术栈总览)
- [项目结构](#项目结构)
- [可用脚本](#可用脚本)
- [API 端点](#api-端点)
- [环境变量](#环境变量)
- [系统架构](#系统架构)
    - [整体架构图](#整体架构图)
    - [协作网关](#协作网关-the-hub)
    - [数据流向](#数据流向-data-pipeline)
- [协同算法核心](#协同算法核心)
    - [CRDT 与 Yjs](#crdt-与-yjs)
    - [用户感知 Awareness](#用户感知-awareness)
- [版本管理系统](#版本管理系统)
    - [状态向量哈希](#核心逻辑状态向量哈希)
    - [编辑器状态机](#编辑器状态机)
    - [版本回溯流程](#版本回溯流程)
    - [可视化差异比对](#可视化差异比对)
- [数据模型设计](#数据模型设计)
- [富文本分块与组件化](#富文本分块与组件化)
- [工程化设计](#工程化设计)
- [开发排期](#开发排期)
- [Vibe Coding 提效指南](#vibe-coding-提效指南)
- [附录：关键概念速查](#附录关键概念速查)

---

## 核心能力

| 能力         | 描述                                  |
| ------------ | ------------------------------------- |
| 实时协同     | 多用户同时编辑同一文档，毫秒级同步    |
| 协作感知     | 实时光标追踪、选区高亮、在线头像      |
| 版本回溯     | 类 Git 的版本管理，基于 CRDT 状态向量 |
| 差异比对     | 可视化 Diff，红绿高亮展示版本变更     |
| 富文本组件化 | 自定义块（Task、AI 生成块等）         |

---

## 快速开始

### 前置条件

| 工具                    | 版本要求   | 用途               |
| ----------------------- | ---------- | ------------------ |
| Node.js                 | >= 22 LTS  | 运行前后端         |
| pnpm                    | >= 10      | 包管理器           |
| Docker & Docker Compose | 最新稳定版 | PostgreSQL + Redis |

### 1. 安装依赖

```bash
nvm use 22
pnpm install
```

### 2. 启动基础设施

```bash
# 启动 PostgreSQL 和 Redis
pnpm db:up

# 等待服务就绪
docker ps
```

### 3. 配置环境变量

```bash
# 后端配置（如已有 .env 可跳过）
cp backend/.env.example backend/.env
```

确认 `backend/.env` 中 `DATABASE_URL` 与 `docker-compose.yml` 一致：

```
DATABASE_URL="postgresql://collab:collab123@localhost:5432/collab_editor"
```

### 4. 数据库迁移

```bash
pnpm db:migrate

# (可选) 填充种子数据
pnpm db:seed
```

### 5. 启动开发服务器

```bash
# 同时启动前端和后端
pnpm dev

# 或单独启动
pnpm dev:backend   # Backend API  http://localhost:3001
pnpm dev:frontend  # Frontend      http://localhost:3000
```

> Hocuspocus WebSocket 服务器自动随 Backend 启动，端口 `ws://localhost:3002`

### 6. 验证

```bash
# 测试注册
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"12345678"}'

# 测试登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"12345678"}'
```

---

## 技术栈总览

```mermaid
graph LR
    subgraph Frontend["Frontend"]
        A[Next.js 15 App Router]
        B[Tailwind CSS + ShadcnUI]
        C[Tiptap Editor]
        D[Yjs Client]
    end

    subgraph Backend["Backend"]
        E[NestJS 11]
        F[Hocuspocus Server]
        G[Prisma ORM]
    end

    subgraph Storage["Storage"]
        H[(PostgreSQL)]
        I[(Redis)]
    end

    C --> D
    D <-->|WebSocket| F
    F --> E
    E --> G
    G --> H
    F --> I
```

| 层级           | 技术                    | 选型理由                             |
| -------------- | ----------------------- | ------------------------------------ |
| **前端框架**   | Next.js 15 (App Router) | RSC 支持，文档详情页 SSR 渲染        |
| **UI 组件**    | Tailwind CSS + ShadcnUI | 现代化交互，AI 生成友好              |
| **编辑器内核** | Tiptap (ProseMirror)    | 无头编辑器，与 Yjs 深度集成          |
| **协同引擎**   | Yjs (CRDT - YATA 算法)  | 最强最终一致性方案，无需手动处理冲突 |
| **后端框架**   | NestJS 11               | 模块化架构，TypeScript 原生支持      |
| **协同中继**   | Hocuspocus              | Tiptap 官方 Yjs 协同服务，钩子式开发 |
| **ORM**        | Prisma                  | 类型安全，AI 识别 Schema 效果最佳    |
| **主存储**     | PostgreSQL (BYTEA)      | 二进制存储 Yjs 文档，版本回溯基石    |
| **缓存/消息**  | Redis                   | WebSocket 扩展与消息总线             |

> **选型原则**：同构 TypeScript、黑盒化一致性、类型安全。

---

## 项目结构

```
.
├── frontend/              # Next.js 15 前端
│   ├── app/               # App Router 页面
│   │   ├── (auth)/        # 登录/注册
│   │   └── (main)/        # 文档列表、设置
│   ├── components/        # React 组件 (ShadcnUI)
│   ├── hooks/             # 自定义 Hooks
│   ├── lib/               # 工具函数 & API 客户端
│   ├── providers/         # React Context Providers
│   ├── stores/            # Zustand 状态管理
│   ├── types/             # TypeScript 类型定义
│   └── __tests__/         # Vitest 测试
│
├── backend/               # NestJS 11 后端
│   ├── src/
│   │   ├── modules/       # 功能模块
│   │   │   ├── auth/      # 认证 (JWT + Passport)
│   │   │   ├── documents/ # 文档 CRUD
│   │   │   ├── versions/  # 版本管理
│   │   │   └── collaboration/ # Hocuspocus 协同网关
│   │   ├── prisma/        # Prisma 服务
│   │   ├── config/        # 配置管理
│   │   └── common/        # 全局过滤器 & 拦截器
│   └── prisma/            # 数据库 Schema & 迁移
│
├── packages/              # 共享配置 (ESLint, Prettier, TypeScript)
├── docs/                  # 技术文档
├── docker-compose.yml     # PostgreSQL + Redis + 应用服务
├── turbo.json             # Turborepo 任务编排
└── pnpm-workspace.yaml    # pnpm workspace 配置
```

---

## 可用脚本

| 命令                | 说明                               |
| ------------------- | ---------------------------------- |
| `pnpm dev`          | 启动所有服务（前端 + 后端）        |
| `pnpm dev:backend`  | 仅启动后端 (http://localhost:3001) |
| `pnpm dev:frontend` | 仅启动前端 (http://localhost:3000) |
| `pnpm build`        | 构建所有包                         |
| `pnpm lint`         | Lint 所有包                        |
| `pnpm test`         | 运行所有测试                       |
| `pnpm db:up`        | 启动 Docker 基础设施               |
| `pnpm db:down`      | 停止 Docker 服务                   |
| `pnpm db:migrate`   | 运行数据库迁移                     |
| `pnpm db:studio`    | 打开 Prisma Studio                 |
| `pnpm db:seed`      | 填充种子数据                       |

---

## API 端点

### Auth

| 方法 | 路径                 | 说明                       |
| ---- | -------------------- | -------------------------- |
| POST | `/api/auth/register` | 用户注册                   |
| POST | `/api/auth/login`    | 用户登录                   |
| POST | `/api/auth/logout`   | 用户登出（需认证）         |
| POST | `/api/auth/refresh`  | 刷新令牌                   |
| GET  | `/api/auth/me`       | 获取当前用户信息（需认证） |

### Documents

| 方法   | 路径                 | 说明     |
| ------ | -------------------- | -------- |
| GET    | `/api/documents`     | 文档列表 |
| POST   | `/api/documents`     | 创建文档 |
| GET    | `/api/documents/:id` | 获取文档 |
| PUT    | `/api/documents/:id` | 更新文档 |
| DELETE | `/api/documents/:id` | 删除文档 |

### Versions

| 方法 | 路径                          | 说明     |
| ---- | ----------------------------- | -------- |
| GET  | `/api/documents/:id/versions` | 版本列表 |
| POST | `/api/documents/:id/versions` | 创建版本 |

### WebSocket

| 端点                  | 协议       | 说明                     |
| --------------------- | ---------- | ------------------------ |
| `ws://localhost:3002` | Hocuspocus | Yjs 实时协同（JWT 认证） |

---

## 环境变量

### 后端 (`backend/.env`)

```bash
# 服务
PORT=3001
NODE_ENV=development

# 数据库
DATABASE_URL="postgresql://collab:collab123@localhost:5432/collab_editor"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT（必填，启动时校验）
JWT_SECRET=your-secret-change-in-production
JWT_EXPIRES_IN=7d

# WebSocket (Hocuspocus)
WS_PORT=3002

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 前端 (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002
```

---

## 系统架构

### 整体架构图

```mermaid
graph TB
    subgraph Clients["Clients"]
        U1["User A<br/>Tiptap + Yjs"]
        U2["User B<br/>Tiptap + Yjs"]
        U3["User C<br/>Tiptap + Yjs"]
    end

    subgraph Gateway["Collaboration Gateway (NestJS + Hocuspocus)"]
        WS["WebSocket Server"]
        AUTH["onAuthenticate<br/>JWT"]
        ROOM["Room Manager<br/>documentId = Room"]
        STORE["onStoreDocument<br/>Async Persist"]
        APPLY["onApply<br/>Broadcast"]
    end

    subgraph Persistence["Persistence"]
        PG[(PostgreSQL<br/>Documents + Versions)]
        RD[(Redis<br/>Pub/Sub + Cache)]
    end

    U1 <-->|"Yjs Binary Updates"| WS
    U2 <-->|"Yjs Binary Updates"| WS
    U3 <-->|"Yjs Binary Updates"| WS

    WS --> AUTH
    AUTH --> ROOM
    ROOM --> APPLY
    APPLY --> STORE
    STORE --> PG
    WS <--> RD
```

### 协作网关 (The Hub)

Hocuspocus 作为 WebSocket 网关集成在 NestJS 中，提供以下核心钩子：

| 钩子              | 职责     | 说明                                |
| ----------------- | -------- | ----------------------------------- |
| `onAuthenticate`  | 鉴权     | 校验 JWT，判断用户读/写权限         |
| `onConnect`       | 连接管理 | 用户加入房间，初始化 Awareness      |
| `onApply`         | 更新处理 | 接收并广播 Yjs 二进制 Update        |
| `onStoreDocument` | 持久化   | 将 Yjs 副本以 BYTEA 存入 PostgreSQL |
| `onDisconnect`    | 断连清理 | 清除用户 Awareness 状态             |

**房间管理**：以 `documentId` 作为 Room Name，实现文档间的物理隔离。

### 数据流向 (Data Pipeline)

```mermaid
sequenceDiagram
    participant U as User A (Tiptap)
    participant Y as Yjs (Client)
    participant WS as WebSocket
    participant HP as Hocuspocus (NestJS)
    participant DB as PostgreSQL
    participant O as Other Users

    Note over U,O: Real-time Stream
    U->>Y: Edit operation
    Y->>Y: Generate Yjs Transaction
    Y->>WS: Send binary Update (Uint8Array)
    WS->>HP: Forward to Hocuspocus
    HP->>O: Broadcast to same room

    Note over HP,DB: Async Persistence
    HP->>HP: onStoreDocument triggered
    HP->>DB: Store Yjs binary (BYTEA)

    Note over HP,DB: Version Snapshot
    HP->>HP: Threshold reached (300 updates / 5 min)
    HP->>HP: Extract State Vector + SHA-256 hash
    HP->>DB: Insert Version record
```

---

## 协同算法核心

### CRDT 与 Yjs

> **核心原则：100% 信任 Yjs 的 YATA 算法，无需手动处理冲突。**

Yjs 采用 CRDT（无冲突复制数据类型）中的 YATA 算法，保证：

- **最终一致性**：无论操作到达顺序如何，所有客户端最终收敛到相同状态
- **意图保留**：通过 Tiptap 的 Collaboration 扩展，加粗、链接等样式在并发编辑时不会出现"索引漂移"
- **离线支持**：断网期间的操作会在重连后自动合并

```mermaid
graph LR
    subgraph CRDT["Yjs YATA"]
        OP1["Op A: insert 'Hello'<br/>clientA:clock=1"]
        OP2["Op B: insert 'World'<br/>clientB:clock=1"]
        OP3["Merged<br/>'HelloWorld'"]
    end
    OP1 --> OP3
    OP2 --> OP3

    style OP3 fill:#2d6a4f,color:#fff
```

### 用户感知 (Awareness)

Awareness 协议独立于文档同步，用于传递"非持久化"的协作状态：

| 功能       | 实现方式                           |
| ---------- | ---------------------------------- |
| 实时光标   | 广播光标位置坐标，前端渲染彩色光标 |
| 选区高亮   | 同步选中区域，以半透明色块展示     |
| 协作者头像 | 在文档顶部展示当前在线用户列表     |

---

## 版本管理系统

> 在 CRDT 体系下，版本不再是简单的文件快照，而是 **DAG（有向无环图）** 中的特定状态点。基于"数学参考点"而非"物理快照"，极大降低存储压力（一个版本记录仅需几十字节），且能完美处理高并发下的版本回溯冲突。

### 核心逻辑：状态向量哈希

**状态向量**记录了每个客户端 (`clientID`) 已处理到的逻辑时钟 (`clock`)。将此 Map（如 `{ clientA: 105, clientB: 42 }`）进行 SHA-256 哈希，生成类似 Git Commit ID 的哈希值。

```mermaid
graph LR
    SV["State Vector<br/>{ clientA: 105, clientB: 42 }"]
    HASH["SHA-256"]
    CID["Version Hash<br/>a3f2b7c..."]

    SV --> HASH --> CID

    style CID fill:#e76f51,color:#fff
```

| 维度     | Git                | 本系统 (Yjs CRDT)       |
| -------- | ------------------ | ----------------------- |
| 哈希来源 | 文件内容           | 状态向量 (State Vector) |
| 版本结构 | 线性链表 / 分支树  | DAG (有向无环图)        |
| 冲突处理 | 手动 Merge         | 自动收敛 (YATA)         |
| 存储开销 | 完整快照 / Delta   | 几十字节状态向量        |
| 回退方式 | 物理重置 HEAD 指针 | 生成逆向 Update 包      |

### 编辑器状态机

```mermaid
stateDiagram-v2
    [*] --> Live

    Live: Live Mode (Default)
    Live: Bidirectional sync, real-time editing
    Live: Hocuspocus persists BYTEA

    History: History Mode
    History: Read-only, load specific State Vector

    Restore: Restore Mode
    Restore: Generate reverse Update package
    Restore: Push to Live channel

    Live --> History: Click "View History"
    History --> Live: Click "Back to Edit"
    History --> Restore: Click "Restore"
    Restore --> Live: Reverse Update broadcast complete
```

| 状态        | 行为     | 数据流                               | 编辑器     |
| ----------- | -------- | ------------------------------------ | ---------- |
| **Live**    | 双向同步 | Tiptap -> Yjs Updates -> Broadcast   | 可编辑     |
| **History** | 单向查看 | 加载历史 State Vector -> 渲染快照    | `readOnly` |
| **Restore** | 逆向回退 | 计算差异 -> 逆向 Update -> 推送 Live | 自动切换   |

### 版本回溯流程

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (Tiptap)
    participant API as NestJS API
    participant DB as PostgreSQL

    Note over U,DB: Auto Create Version
    API->>API: Detect threshold (300 updates / 5 min)
    API->>API: Y.encodeStateVector(ydoc)
    API->>API: SHA-256(stateVector) -> hash
    API->>DB: INSERT INTO versions

    Note over U,DB: View History
    U->>FE: Click "Version History"
    FE->>API: GET /versions/:documentId
    API->>DB: SELECT * FROM versions
    DB-->>FE: Version list

    Note over U,DB: Preview Version
    U->>FE: Select a version
    FE->>API: GET /versions/:hash/snapshot
    API->>DB: Read stateVector
    API-->>FE: Return snapshot Update
    FE->>FE: Switch to History mode (readOnly)

    Note over U,DB: Restore Version
    U->>FE: Click "Restore"
    FE->>API: POST /versions/:hash/restore
    API->>FE: Push reverse Update to Live
    FE->>FE: Switch back to Live mode
```

### 可视化差异比对

使用 Tiptap 的 `SnapshotCompare` 扩展实现块级 Diff：

```mermaid
graph TB
    V1["Version A (old)"]
    V2["Version B (new)"]
    DIFF["Diff Engine<br/>Y.encodeStateAsUpdate(doc, snapshotA)"]
    RENDER["Tiptap Render"]

    V1 --> DIFF
    V2 --> DIFF
    DIFF --> RENDER

    subgraph Visual["Visual Result"]
        DEL["Deleted content<br/>Red underline"]
        ADD["Added content<br/>Green highlight"]
        KEEP["Unchanged<br/>Normal"]
    end

    RENDER --> DEL
    RENDER --> ADD
    RENDER --> KEEP
```

---

## 数据模型设计

### ER 关系图

```mermaid
erDiagram
    User ||--o{ Document : "creates"
    Document ||--o{ DocumentVersion : "has"
    Document ||--o{ DocumentCollaborator : "shared with"
    User ||--o{ DocumentCollaborator : "participates"
    User ||--o{ Session : "has"

    User {
        String id PK "CUID"
        String email UK
        String username UK
        String password
        String nickname
        String avatar
        UserStatus status
    }

    Document {
        String id PK "CUID = Room Name"
        String title
        String description
        Bytes content "Yjs binary state"
        Boolean isPublic
        DocumentStatus status
        String authorId FK
    }

    DocumentVersion {
        String id PK
        String documentId FK
        Int version
        Bytes content "Yjs snapshot (binary)"
        String changeLog
        String createdBy FK
    }

    DocumentEdit {
        String id PK
        String documentId FK
        String userId
        Bytes operation "Yjs update (binary)"
        Int version
    }

    DocumentCollaborator {
        String id PK
        String documentId FK
        String userId FK
        CollaboratorRole role
    }

    Session {
        String id PK
        String userId FK
        String token
        String refreshToken
        DateTime expiresAt
    }
```

### Prisma Schema 关键设计

> `Document.content` 存储 Yjs 实时二进制副本，`DocumentVersion.content` 存储版本快照，`DocumentEdit.operation` 存储增量操作。**全部使用 `Bytes` 类型（PostgreSQL BYTEA），绝不存储 HTML 字符串。**

---

## 富文本分块与组件化

### 文档模型

采用 **JSON Tree** 作为文档模型：

```mermaid
graph TD
    DOC["Document"]
    DOC --> H1["Heading 1"]
    DOC --> P1["Paragraph"]
    DOC --> TASK["TaskBlock<br/>(custom interactive)"]
    DOC --> AI["AIBlock<br/>(readOnly)"]
    DOC --> P2["Paragraph"]

    style TASK fill:#264653,color:#fff
    style AI fill:#6a0dad,color:#fff
```

### 三层架构

```mermaid
graph TB
    subgraph View["View Layer (Tiptap)"]
        EDITOR["Tiptap Editor"]
        DIFF_VIEW["SnapshotCompare Diff"]
    end

    subgraph Protocol["Protocol Layer (Update Log)"]
        UPDATES["Update delta packages"]
        VERSIONS["Version hash records"]
    end

    subgraph Data["Data Layer (Y.Doc)"]
        YDOC["Y.Doc<br/>Atomic operations<br/>Each char/block has unique ID"]
    end

    EDITOR <--> YDOC
    DIFF_VIEW <--> YDOC
    YDOC --> UPDATES
    YDOC --> VERSIONS
    UPDATES --> DB[(PostgreSQL)]
    VERSIONS --> DB
```

---

## 工程化设计

### Monorepo 结构

使用 **pnpm workspace** + **Turborepo** 管理：

```
.
├── frontend/               # Next.js 15 前端
├── backend/                # NestJS 11 后端
├── packages/               # 共享配置
├── docs/                   # 技术文档
├── docker-compose.yml      # 基础设施编排
├── turbo.json              # Turborepo 任务
└── pnpm-workspace.yaml     # Workspace 定义
```

### 开发规范

- NestJS 官方推荐的模块化结构 (Module / Controller / Service)
- Prisma 类型通过 `@prisma/client` 自动导出，禁止手动定义重复类型
- Yjs 二进制数据使用 `Uint8Array` 类型，数据库使用 `BYTEA` 存储
- WebSocket 网关统一使用 Hocuspocus 钩子，禁止手写底层协议
- 版本哈希使用 `SHA-256(stateVector)`，禁止基于内容哈希

---

## 开发排期

> **总周期：4 周 / 1 个月**

```mermaid
gantt
    title Collab Editor Development Schedule
    dateFormat  YYYY-MM-DD
    axisFormat  %m/%d

    section W1: Foundation
    NestJS scaffold & module setup    :w1a, 2025-01-06, 3d
    Prisma model & migration          :w1b, after w1a, 2d
    Next.js base UI                   :w1c, after w1b, 2d

    section W2: Collaboration
    Hocuspocus integration            :w2a, after w1c, 3d
    Tiptap + Yjs binding              :w2b, after w2a, 2d
    Real-time collab testing          :w2c, after w2b, 2d

    section W3: Versioning
    Binary Update persistence         :w3a, after w2c, 2d
    State Vector snapshot API         :w3b, after w3a, 3d
    Version diff UI                   :w3c, after w3b, 2d

    section W4: Polish
    Awareness cursor tracking         :w4a, after w3c, 2d
    UI/UX optimization                :w4b, after w4a, 2d
    Deploy & load testing             :w4c, after w4b, 3d
```

---

## Vibe Coding 提效指南

### 核心原则

> **不要自己写 WebSocket 协议。** 直接用 Hocuspocus——它把 Yjs 的二进制同步封装成了简单的钩子，你只需要写业务逻辑。

> **二进制存取。** PostgreSQL 的 `BYTEA` 类型是存储 Yjs 文档的最佳方式，**千万不要存 HTML 字符串**，否则版本回溯会变成一场灾难。

### AI 提示词参考

**基础架构搭建：**

```
请按照 NestJS 官方推荐的模块化结构，为我生成一个处理文档同步的 Gateway，
集成 Hocuspocus 库，并连接我已有的权限守卫。
```

**存储逻辑：**

```
请在 NestJS 中使用 Prisma 建立两个模型：Document 存二进制 blob，Version 存 stateVector。
当 Hocuspocus 触发 onStoreDocument 且达到 50 次更新时，请帮我实现一个逻辑：
提取当前 Y.Doc 的状态向量，计算 SHA-256 哈希，并将其作为一个新版本记录到 Version 表中。
```

**版本回退逻辑：**

```
我需要一个功能：给出一个版本的哈希值，从数据库读取其 stateVector，
然后利用 Yjs 的 encodeStateAsUpdate 函数生成该版本的快照。
请写一个前端函数，让我的 Tiptap 编辑器临时显示这个快照内容而不影响远程数据库。
```

---

## 附录：关键概念速查

| 概念             | 解释                                                 |
| ---------------- | ---------------------------------------------------- |
| **CRDT**         | 无冲突复制数据类型，保证分布式环境下数据最终一致     |
| **YATA**         | Yjs 使用的 CRDT 算法，专为文本协同优化               |
| **State Vector** | 记录每个客户端已处理到的逻辑时钟，是版本的"数学坐标" |
| **Awareness**    | 独立于文档的协作状态协议（光标、选区、在线状态）     |
| **Hocuspocus**   | Tiptap 官方的 Yjs WebSocket 服务端，钩子式 API       |
| **BYTEA**        | PostgreSQL 的二进制数据类型，用于存储 Yjs 文档       |
| **DAG**          | 有向无环图，CRDT 版本历史的组织结构                  |

---

<p align="center">
  <em>Built with Vibe Coding — AI-Assisted Development</em>
</p>
