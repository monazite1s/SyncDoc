│ 协同文档编辑与版本回溯系统 - 文档编写计划                                            │
│                                                                                      │
│ Context（背景）                                                                      │
│                                                                                      │
│ 本项目是一个实时多人协同文档编辑器，基于 CRDT（Yjs）实现工业级实时协同编辑与类 Git   │
│ 版本管理。用户已有一份详细的 readme.md                                               │
│ 概述，现需要创建完整的开发文档体系，以便于后续的 AI 辅助开发（Vibe Coding）。        │
│                                                                                      │
│ 文档结构规划                                                                         │
│                                                                                      │
│ 将在 /Users/rongzhenma/learn/Doc/docs/ 目录下创建以下文档：                          │
│                                                                                      │
│ docs/                                                                                │
│ ├── 01-architecture/           # 系统架构设计                                        │
│ │   ├── README.md             # 架构总览                                             │
│ │   ├── tech-stack.md         # 技术栈选型（2026视角）                               │
│ │   ├── system-architecture.md # 整体架构设计                                        │
│ │   └── data-flow.md          # 数据流向设计                                         │
│ │                                                                                    │
│ ├── 02-security/               # 安全设计（独立章节）                                │
│ │   ├── README.md             # 安全设计总览                                         │
│ │   ├── authentication.md     # JWT认证机制                                          │
│ │   ├── authorization.md      # 权限控制（RBAC）                                     │
│ │   ├── data-encryption.md    # 数据加密策略                                         │
│ │   └── security-best-practices.md # 安全最佳实践                                    │
│ │                                                                                    │
│ ├── 03-frontend/               # 前端开发文档                                        │
│ │   ├── README.md             # 前端总览                                             │
│ │   ├── project-structure.md  # 工程化结构                                           │
│ │   ├── tiptap-integration.md # Tiptap编辑器集成                                     │
│ │   ├── yjs-client.md         # Yjs客户端配置                                        │
│ │   ├── error-handling.md     # 错误处理与边界                                       │
│ │   └── performance.md        # 性能优化策略                                         │
│ │                                                                                    │
│ ├── 04-backend/                # 后端开发文档                                        │
│ │   ├── README.md             # 后端总览                                             │
│ │   ├── nestjs-modules.md     # NestJS模块设计                                       │
│ │   ├── hocuspocus-gateway.md # Hocuspocus网关                                       │
│ │   ├── prisma-schema.md      # 数据模型设计                                         │
│ │   ├── version-management.md # 版本管理逻辑                                         │
│ │   └── api-reference.md      # API接口文档                                          │
│ │                                                                                    │
│ ├── 05-collaboration/          # 协同核心文档                                        │
│ │   ├── README.md             # 协同机制总览                                         │
│ │   ├── crdt-yjs.md           # CRDT与Yjs原理                                        │
│ │   ├── awareness-protocol.md # Awareness协议                                        │
│ │   ├── version-workflow.md   # 版本管理流程                                         │
│ │   └── conflict-resolution.md # 冲突解决机制                                        │
│ │                                                                                    │
│ ├── 06-deployment/             # 部署与运维（GitHub免费生态）                        │
│ │   ├── README.md             # 部署总览                                             │
│ │   ├── platform-overview.md  # 免费平台概览                                         │
│ │   ├── vercel-deploy.md      # Vercel前端部署                                       │
│ │   ├── railway-render.md     # Railway/Render后端部署                               │
│ │   ├── database-setup.md     # Neon/Supabase/Upstash配置                            │
│ │   ├── cicd-pipeline.md      # GitHub Actions CI/CD                                 │
│ │   ├── environment.md        # 环境变量配置                                         │
│ │   └── monitoring.md         # 监控与日志                                           │
│ │                                                                                    │
│ └── 07-schedule/               # 排期估算                                            │
│     └── development-schedule.md # 开发排期                                           │
│                                                                                      │
│ ---                                                                                  │
│ 文档深度说明                                                                         │
│                                                                                      │
│ 根据用户选择采用混合模式：                                                           │
│ - 核心模块（详细代码级）：协同编辑、版本管理、Hocuspocus网关、Tiptap集成             │
│ - 周边模块（架构设计级）：工程化配置、监控、UI组件                                   │
│                                                                                      │
│ ---                                                                                  │
│ 各文档详细规划                                                                       │
│                                                                                      │
│ 1. 系统架构设计文档 (01-architecture/)                                               │
│                                                                                      │
│ 1.1 技术栈选型（2026年视角）                                                         │
│                                                                                      │
│ 层级: 前端框架                                                                       │
│ 技术: Next.js 15+                                                                    │
│ 版本: App Router + Turbopack                                                         │
│ 选型理由: RSC成熟，性能优化完善                                                      │
│ ────────────────────────────────────────                                             │
│ 层级: UI组件                                                                         │
│ 技术: Tailwind CSS 4 + ShadcnUI                                                      │
│ 版本: 最新稳定版                                                                     │
│ 选型理由: 现代化，AI生成友好                                                         │
│ ────────────────────────────────────────                                             │
│ 层级: 编辑器内核                                                                     │
│ 技术: Tiptap 3.x                                                                     │
│ 版本: ProseMirror                                                                    │
│ 选型理由: 无头编辑器，Yjs深度集成                                                    │
│ ────────────────────────────────────────                                             │
│ 层级: 协同引擎                                                                       │
│ 技术: Yjs + y-websocket                                                              │
│ 版本: 最新稳定版                                                                     │
│ 选型理由: CRDT YATA算法，工业级                                                      │
│ ────────────────────────────────────────                                             │
│ 层级: 后端框架                                                                       │
│ 技术: NestJS 11+                                                                     │
│ 版本: 最新LTS                                                                        │
│ 选型理由: 模块化，TypeScript原生                                                     │
│ ────────────────────────────────────────                                             │
│ 层级: 协同中继                                                                       │
│ 技术: Hocuspocus 3.x                                                                 │
│ 版本: Tiptap官方                                                                     │
│ 选型理由: 钩子式开发，易扩展                                                         │
│ ────────────────────────────────────────                                             │
│ 层级: ORM                                                                            │
│ 技术: Prisma 6+                                                                      │
│ 版本: 最新稳定版                                                                     │
│ 选型理由: 类型安全，迁移完善                                                         │
│ ────────────────────────────────────────                                             │
│ 层级: 主存储                                                                         │
│ 技术: PostgreSQL 17                                                                  │
│ 版本: 最新LTS                                                                        │
│ 选型理由: BYTEA支持，JSONB优化                                                       │
│ ────────────────────────────────────────                                             │
│ 层级: 缓存/消息                                                                      │
│ 技术: Redis 8+                                                                       │
│ 版本: 最新稳定版                                                                     │
│ 选型理由: Pub/Sub，分布式锁                                                          │
│ ────────────────────────────────────────                                             │
│ 层级: 运行时                                                                         │
│ 技术: Node.js 22 LTS                                                                 │
│ 版本: 或 Bun 2.x                                                                     │
│ 选型理由: 性能优化，原生TS                                                           │
│                                                                                      │
│ 1.2 整体架构图                                                                       │
│                                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐                  │
│ │                        客户端层 (Client)                         │                 │
│ │  ┌─────────────────────────────────────────────────────────┐   │                   │
│ │  │  Next.js 15 App Router                                  │   │                   │
│ │  │  ├── React Server Components (SSR)                     │   │                    │
│ │  │  ├── Tiptap Editor (Client Component)                  │   │                    │
│ │  │  ├── Yjs Provider (WebSocket)                          │   │                    │
│ │  │  └── Awareness State Manager                           │   │                    │
│ │  └─────────────────────────────────────────────────────────┘   │                   │
│ └─────────────────────────────────────────────────────────────────┘                  │
│                               │ WebSocket (Yjs Binary)                               │
│                               ▼                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐                  │
│ │                      网关层 (Gateway)                            │                 │
│ │  ┌─────────────────────────────────────────────────────────┐   │                   │
│ │  │  NestJS 11 + Hocuspocus 3                               │   │                   │
│ │  │  ├── onAuthenticate (JWT验证)                          │   │                    │
│ │  │  ├── onConnect (房间管理)                              │   │                    │
│ │  │  ├── onApply (更新广播)                                │   │                    │
│ │  │  ├── onStoreDocument (持久化)                          │   │                    │
│ │  │  └── onDisconnect (清理)                               │   │                    │
│ │  └─────────────────────────────────────────────────────────┘   │                   │
│ └─────────────────────────────────────────────────────────────────┘                  │
│                               │                                                      │
│                               ▼                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐                  │
│ │                      服务层 (Service)                            │                 │
│ │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │                    │
│ │  │ AuthService  │  │ DocService   │  │ VersionSvc   │         │                    │
│ │  └──────────────┘  └──────────────┘  └──────────────┘         │                    │
│ └─────────────────────────────────────────────────────────────────┘                  │
│                               │                                                      │
│                               ▼                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐                  │
│ │                      数据层 (Data)                               │                 │
│ │  ┌──────────────────┐           ┌──────────────────┐          │                    │
│ │  │ PostgreSQL 17    │           │ Redis 8          │          │                    │
│ │  │ ├── Documents    │           │ ├── Session Cache│          │                    │
│ │  │ ├── Versions     │           │ ├── Pub/Sub      │          │                    │
│ │  │ └── Collaborators│           │ └── Rate Limit   │          │                    │
│ │  └──────────────────┘           └──────────────────┘          │                    │
│ └─────────────────────────────────────────────────────────────────┘                  │
│                                                                                      │
│ ---                                                                                  │
│ 2. 安全设计文档 (02-security/) - 独立章节                                            │
│                                                                                      │
│ 2.1 JWT认证机制                                                                      │
│                                                                                      │
│ sequenceDiagram                                                                      │
│     participant C as Client                                                          │
│     participant A as Auth API                                                        │
│     participant J as JWT Service                                                     │
│     participant R as Redis                                                           │
│                                                                                      │
│     C->>A: POST /auth/login (email, password)                                        │
│     A->>A: 验证凭证                                                                  │
│     A->>J: 生成 JWT Token                                                            │
│     J-->>A: accessToken + refreshToken                                               │
│     A->>R: 存储 refreshToken (TTL: 7d)                                               │
│     A-->>C: { accessToken, refreshToken }                                            │
│                                                                                      │
│     Note over C,R: 后续请求                                                          │
│     C->>A: API Request + Bearer Token                                                │
│     A->>J: 验证 Token                                                                │
│     J-->>A: User Payload                                                             │
│     A->>A: 处理请求                                                                  │
│                                                                                      │
│ 认证策略：                                                                           │
│ - accessToken：短期有效（15分钟），用于API访问                                       │
│ - refreshToken：长期有效（7天），存储于Redis                                         │
│ - WebSocket认证：通过URL参数或首次消息传递token                                      │
│                                                                                      │
│ 2.2 权限控制（RBAC）                                                                 │
│                                                                                      │
│ graph TB                                                                             │
│     subgraph Roles                                                                   │
│         OWNER["OWNER<br/>完全控制"]                                                  │
│         EDITOR["EDITOR<br/>读写权限"]                                                │
│         VIEWER["VIEWER<br/>只读权限"]                                                │
│     end                                                                              │
│                                                                                      │
│     subgraph Permissions                                                             │
│         READ["读取文档"]                                                             │
│         WRITE["编辑内容"]                                                            │
│         MANAGE["管理协作者"]                                                         │
│         DELETE["删除文档"]                                                           │
│         VERSION["版本操作"]                                                          │
│     end                                                                              │
│                                                                                      │
│     OWNER --> READ                                                                   │
│     OWNER --> WRITE                                                                  │
│     OWNER --> MANAGE                                                                 │
│     OWNER --> DELETE                                                                 │
│     OWNER --> VERSION                                                                │
│                                                                                      │
│     EDITOR --> READ                                                                  │
│     EDITOR --> WRITE                                                                 │
│     EDITOR --> VERSION                                                               │
│                                                                                      │
│     VIEWER --> READ                                                                  │
│                                                                                      │
│ 2.3 数据加密策略                                                                     │
│                                                                                      │
│ ┌────────────┬──────────────────┬─────────────────┐                                  │
│ │  数据类型  │     加密方式     │      说明       │                                  │
│ ├────────────┼──────────────────┼─────────────────┤                                  │
│ │ 密码       │ bcrypt (cost=12) │ 单向哈希        │                                  │
│ ├────────────┼──────────────────┼─────────────────┤                                  │
│ │ JWT Secret │ 环境变量         │ 256位随机字符串 │                                  │
│ ├────────────┼──────────────────┼─────────────────┤                                  │
│ │ Yjs Binary │ 传输层TLS        │ HTTPS/WSS       │                                  │
│ ├────────────┼──────────────────┼─────────────────┤                                  │
│ │ 敏感配置   │ 环境变量         │ 不提交到代码库  │                                  │
│ └────────────┴──────────────────┴─────────────────┘                                  │
│                                                                                      │
│ 2.4 安全最佳实践                                                                     │
│                                                                                      │
│ - CORS配置：白名单域名                                                               │
│ - Rate Limiting：Redis实现限流                                                       │
│ - Input Validation：class-validator                                                  │
│ - SQL注入防护：Prisma参数化查询                                                      │
│ - XSS防护：React自动转义 + CSP                                                       │
│                                                                                      │
│ ---                                                                                  │
│ 3. 前端开发文档 (03-frontend/)                                                       │
│                                                                                      │
│ 2.1 工程化要点                                                                       │
│                                                                                      │
│ - 目录结构规范                                                                       │
│ - TypeScript 严格模式配置                                                            │
│ - ESLint + Prettier 配置                                                             │
│ - 环境变量管理                                                                       │
│                                                                                      │
│ 2.2 错误处理策略                                                                     │
│                                                                                      │
│ ┌─────────────────────────────────────────────────────────┐                          │
│ │                    错误边界架构                          │                         │
│ ├─────────────────────────────────────────────────────────┤                          │
│ │                                                         │                          │
│ │  ┌─────────────────┐   ┌─────────────────┐            │                            │
│ │  │ RootErrorBoundary│   │ EditorErrorBoundary│         │                           │
│ │  │ (全局捕获)       │   │ (编辑器隔离)       │         │                           │
│ │  └─────────────────┘   └─────────────────┘            │                            │
│ │           │                    │                       │                           │
│ │           ▼                    ▼                       │                           │
│ │  ┌─────────────────────────────────────────┐          │                            │
│ │  │ Fallback UI                              │          │                           │
│ │  │ ├── 友好错误提示                         │          │                           │
│ │  │ ├── 重试按钮                             │          │                           │
│ │  │ └── 本地数据恢复提示                     │          │                           │
│ │  └─────────────────────────────────────────┘          │                            │
│ │                                                         │                          │
│ └─────────────────────────────────────────────────────────┘                          │
│                                                                                      │
│ 2.3 性能优化                                                                         │
│                                                                                      │
│ - 代码分割：编辑器按需加载                                                           │
│ - 虚拟列表：长文档优化                                                               │
│ - 防抖节流：输入优化                                                                 │
│ - 离线缓存：Service Worker                                                           │
│                                                                                      │
│ ---                                                                                  │
│ 4. 后端开发文档 (04-backend/)                                                        │
│                                                                                      │
│ 3.1 NestJS 模块设计（Mermaid图）                                                     │
│                                                                                      │
│ graph TB                                                                             │
│     subgraph AppModule                                                               │
│         AuthModule                                                                   │
│         DocumentModule                                                               │
│         CollaborationModule                                                          │
│         VersionModule                                                                │
│         PrismaModule                                                                 │
│         RedisModule                                                                  │
│     end                                                                              │
│                                                                                      │
│     subgraph CollaborationModule                                                     │
│         HocuspocusGateway                                                            │
│         RoomManager                                                                  │
│         AwarenessService                                                             │
│     end                                                                              │
│                                                                                      │
│     subgraph VersionModule                                                           │
│         VersionController                                                            │
│         VersionService                                                               │
│         SnapshotService                                                              │
│         DiffService                                                                  │
│     end                                                                              │
│                                                                                      │
│ 3.2 Hocuspocus 钩子流程                                                              │
│                                                                                      │
│ sequenceDiagram                                                                      │
│     participant C as Client                                                          │
│     participant H as Hocuspocus                                                      │
│     participant A as AuthService                                                     │
│     participant D as DocumentService                                                 │
│     participant DB as PostgreSQL                                                     │
│                                                                                      │
│     C->>H: WebSocket Connect                                                         │
│     H->>A: onAuthenticate(token)                                                     │
│     A-->>H: UserContext                                                              │
│                                                                                      │
│     H->>D: onLoadDocument(documentId)                                                │
│     D->>DB: SELECT blob FROM documents                                               │
│     DB-->>D: Yjs Binary                                                              │
│     D-->>H: Y.Doc                                                                    │
│                                                                                      │
│     loop 实时编辑                                                                    │
│         C->>H: Binary Update                                                         │
│         H->>H: onApply(update)                                                       │
│         H-->>C: Broadcast to others                                                  │
│     end                                                                              │
│                                                                                      │
│     H->>D: onStoreDocument(ydoc)                                                     │
│     D->>DB: UPDATE documents SET blob                                                │
│                                                                                      │
│ 3.3 版本管理核心逻辑                                                                 │
│                                                                                      │
│ flowchart TD                                                                         │
│     A[编辑操作累积] --> B{达到阈值?}                                                 │
│     B -->|否| A                                                                      │
│     B -->|是| C[提取 State Vector]                                                   │
│     C --> D[计算 SHA-256 哈希]                                                       │
│     D --> E{哈希已存在?}                                                             │
│     E -->|是| A                                                                      │
│     E -->|否| F[创建 Version 记录]                                                   │
│     F --> G[存储 stateVector + blob]                                                 │
│     G --> A                                                                          │
│                                                                                      │
│ ---                                                                                  │
│ 5. 协同核心文档 (05-collaboration/)                                                  │
│                                                                                      │
│ 4.1 CRDT 原理图解                                                                    │
│                                                                                      │
│ graph LR                                                                             │
│     subgraph ClientA["客户端 A"]                                                     │
│         A1["插入 'Hello'<br/>clock=1"]                                               │
│         A2["插入 'World'<br/>clock=2"]                                               │
│     end                                                                              │
│                                                                                      │
│     subgraph ClientB["客户端 B"]                                                     │
│         B1["插入 '!'<br/>clock=1"]                                                   │
│     end                                                                              │
│                                                                                      │
│     subgraph Merge["合并结果"]                                                       │
│         M["YATA 算法自动排序<br/>'HelloWorld!'"]                                     │
│     end                                                                              │
│                                                                                      │
│     A1 --> M                                                                         │
│     A2 --> M                                                                         │
│     B1 --> M                                                                         │
│                                                                                      │
│ 4.2 版本回溯流程                                                                     │
│                                                                                      │
│ stateDiagram-v2                                                                      │
│     [*] --> Live                                                                     │
│                                                                                      │
│     Live --> History: 查看历史版本                                                   │
│     History --> Live: 返回编辑                                                       │
│     History --> Preview: 选择版本预览                                                │
│     Preview --> History: 关闭预览                                                    │
│     Preview --> Restore: 确认恢复                                                    │
│     Restore --> Live: 逆向Update广播                                                 │
│                                                                                      │
│     state Live {                                                                     │
│         [*] --> 同步编辑                                                             │
│         同步编辑 --> 实时持久化                                                      │
│     }                                                                                │
│                                                                                      │
│     state History {                                                                  │
│         [*] --> 版本列表                                                             │
│         版本列表 --> 时间线展示                                                      │
│     }                                                                                │
│                                                                                      │
│ ---                                                                                  │
│ 6. 部署与运维文档 (06-deployment/) - GitHub免费生态                                  │
│                                                                                      │
│ 6.1 免费平台架构                                                                     │
│                                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐                  │
│ │                    GitHub 免费生态部署架构                        │                │
│ ├─────────────────────────────────────────────────────────────────┤                  │
│ │                                                                 │                  │
│ │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │                    │
│ │  │   GitHub    │    │   Vercel    │    │  Railway/   │        │                    │
│ │  │   (代码托管) │───▶│  (前端部署)  │    │  Render     │        │                  │
│ │  │             │    │             │    │  (后端部署)  │        │                   │
│ │  └─────────────┘    └─────────────┘    └─────────────┘        │                    │
│ │         │                                       │               │                  │
│ │         │ GitHub Actions                        │               │                  │
│ │         ▼                                       ▼               │                  │
│ │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │                    │
│ │  │   Neon /    │    │  Upstash    │    │  Cloudflare │        │                    │
│ │  │  Supabase   │◀───│   (Redis)   │    │    (CDN)    │        │                    │
│ │  │ (PostgreSQL)│    │             │    │             │        │                    │
│ │  └─────────────┘    └─────────────┘    └─────────────┘        │                    │
│ │                                                                 │                  │
│ └─────────────────────────────────────────────────────────────────┘                  │
│                                                                                      │
│ 6.2 平台选型与配置                                                                   │
│                                                                                      │
│ ┌────────────┬──────────────┬───────────────┬──────────────┐                         │
│ │    平台    │     用途     │   免费额度    │   配置文件   │                         │
│ ├────────────┼──────────────┼───────────────┼──────────────┤                         │
│ │ Vercel     │ Next.js 前端 │ 100GB带宽/月  │ vercel.json  │                         │
│ ├────────────┼──────────────┼───────────────┼──────────────┤                         │
│ │ Railway    │ NestJS 后端  │ $5/月额度     │ railway.toml │                         │
│ ├────────────┼──────────────┼───────────────┼──────────────┤                         │
│ │ Neon       │ PostgreSQL   │ 0.5GB存储     │ -            │                         │
│ ├────────────┼──────────────┼───────────────┼──────────────┤                         │
│ │ Upstash    │ Redis        │ 10,000命令/天 │ -            │                         │
│ ├────────────┼──────────────┼───────────────┼──────────────┤                         │
│ │ Cloudflare │ CDN + DNS    │ 无限          │ -            │                         │
│ └────────────┴──────────────┴───────────────┴──────────────┘                         │
│                                                                                      │
│ 6.3 GitHub Actions CI/CD                                                             │
│                                                                                      │
│ # .github/workflows/main.yml 完整流程                                                │
│ name: CI/CD Pipeline                                                                 │
│                                                                                      │
│ on:                                                                                  │
│   push:                                                                              │
│     branches: [main, develop]                                                        │
│   pull_request:                                                                      │
│     branches: [main]                                                                 │
│                                                                                      │
│ jobs:                                                                                │
│   lint-test:                                                                         │
│     runs-on: ubuntu-latest                                                           │
│     steps:                                                                           │
│       - uses: actions/checkout@v4                                                    │
│       - uses: pnpm/action-setup@v3                                                   │
│       - run: pnpm install                                                            │
│       - run: pnpm lint                                                               │
│       - run: pnpm test                                                               │
│                                                                                      │
│   deploy-frontend:                                                                   │
│     needs: lint-test                                                                 │
│     if: github.ref == 'refs/heads/main'                                              │
│     runs-on: ubuntu-latest                                                           │
│     steps:                                                                           │
│       - uses: amondnet/vercel-action@v25                                             │
│         with:                                                                        │
│           vercel-token: ${{ secrets.VERCEL_TOKEN }}                                  │
│           vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}                                │
│                                                                                      │
│   deploy-backend:                                                                    │
│     needs: lint-test                                                                 │
│     if: github.ref == 'refs/heads/main'                                              │
│     runs-on: ubuntu-latest                                                           │
│     steps:                                                                           │
│       - uses: railway.app/deploy-action@v1                                           │
│         with:                                                                        │
│           railway-token: ${{ secrets.RAILWAY_TOKEN }}                                │
│                                                                                      │
│ 6.4 环境变量管理                                                                     │
│                                                                                      │
│ # .env.example 模板                                                                  │
│ # Database                                                                           │
│ DATABASE_URL="postgresql://..."                                                      │
│                                                                                      │
│ # Redis                                                                              │
│ UPSTASH_REDIS_REST_URL="https://..."                                                 │
│ UPSTASH_REDIS_REST_TOKEN="..."                                                       │
│                                                                                      │
│ # Auth                                                                               │
│ JWT_SECRET="your-256-bit-secret"                                                     │
│ JWT_EXPIRES_IN="15m"                                                                 │
│ REFRESH_TOKEN_EXPIRES_IN="7d"                                                        │
│                                                                                      │
│ # Hocuspocus                                                                         │
│ HOCUSPOCUS_PORT=1234                                                                 │
│ HOCUSPOCUS_SECRET="your-hocuspocus-secret"                                           │
│                                                                                      │
│ ---                                                                                  │
│ 7. 排期估算文档 (07-schedule/)                                                       │
│                                                                                      │
│ 开发阶段划分                                                                         │
│                                                                                      │
│ ┌──────────────┬───────┬────────────────────────────┬────────────────────┐           │
│ │     阶段     │ 周期  │          核心任务          │       交付物       │           │
│ ├──────────────┼───────┼────────────────────────────┼────────────────────┤           │
│ │ P0: 文档编写 │ 1周   │ 完成全部技术文档           │ docs/ 目录完整文档 │           │
│ ├──────────────┼───────┼────────────────────────────┼────────────────────┤           │
│ │ P1: 基础架构 │ 1周   │ 项目初始化、数据库设计     │ 可运行的空壳项目   │           │
│ ├──────────────┼───────┼────────────────────────────┼────────────────────┤           │
│ │ P2: 协同内核 │ 2周   │ Hocuspocus集成、Tiptap绑定 │ 实时协同编辑可用   │           │
│ ├──────────────┼───────┼────────────────────────────┼────────────────────┤           │
│ │ P3: 版本管理 │ 1.5周 │ 版本快照、回溯、Diff       │ 版本功能完整       │           │
│ ├──────────────┼───────┼────────────────────────────┼────────────────────┤           │
│ │ P4: 交互打磨 │ 1周   │ Awareness、UI优化          │ 产品级体验         │           │
│ ├──────────────┼───────┼────────────────────────────┼────────────────────┤           │
│ │ P5: 部署上线 │ 0.5周 │ CI/CD、监控配置            │ 生产环境可用       │           │
│ └──────────────┴───────┴────────────────────────────┴────────────────────┘           │
│                                                                                      │
│ 总周期：约7周                                                                        │
│                                                                                      │
│ ---                                                                                  │
│ 实施步骤                                                                             │
│                                                                                      │
│ Step 1: 创建文档目录结构                                                             │
│                                                                                      │
│ mkdir -p docs/{01-architecture,02-security,03-frontend,04-backend,05-collaboration,0 │
│ 6-deployment,07-schedule}                                                            │
│                                                                                      │
│ Step 2: 按顺序编写文档                                                               │
│                                                                                      │
│ 1. 01-architecture/ - 系统架构设计（4个文件）                                        │
│ 2. 02-security/ - 安全设计（5个文件）                                                │
│ 3. 04-backend/ - 后端开发文档（6个文件，含Mermaid图，详细代码级）                    │
│ 4. 03-frontend/ - 前端开发文档（6个文件，核心部分详细代码）                          │
│ 5. 05-collaboration/ - 协同核心文档（5个文件，含流程图，详细代码级）                 │
│ 6. 06-deployment/ - 部署运维文档（8个文件，含CI/CD配置）                             │
│ 7. 07-schedule/ - 排期估算（1个文件）                                                │
│                                                                                      │
│ Step 3: 文档质量检查                                                                 │
│                                                                                      │
│ - 确保所有 Mermaid 图表语法正确                                                      │
│ - 验证技术版本号（2026年视角）                                                       │
│ - 检查文档间交叉引用                                                                 │
│ - 确认安全设计章节完整性                                                             │
│                                                                                      │
│ ---                                                                                  │
│ 关键技术决策（2026年视角）                                                           │
│                                                                                      │
│ ┌────────────────┬───────────────────────────┬─────────────────────────────────┐     │
│ │     决策点     │           选择            │              理由               │     │
│ ├────────────────┼───────────────────────────┼─────────────────────────────────┤     │
│ │ Node.js vs Bun │ Node.js 22 LTS            │ 生态成熟，稳定性优先            │     │
│ ├────────────────┼───────────────────────────┼─────────────────────────────────┤     │
│ │ Next.js 版本   │ 15+                       │ App Router 成熟，Turbopack 稳定 │     │
│ ├────────────────┼───────────────────────────┼─────────────────────────────────┤     │
│ │ Tiptap 版本    │ 3.x                       │ 与 Yjs 集成更完善               │     │
│ ├────────────────┼───────────────────────────┼─────────────────────────────────┤     │
│ │ 部署平台       │ GitHub Actions + 免费平台 │ 成本控制，个人开发友好          │     │
│ ├────────────────┼───────────────────────────┼─────────────────────────────────┤     │
│ │ 数据库         │ PostgreSQL 17 + BYTEA     │ 二进制存储原生支持              │     │
│ └────────────────┴───────────────────────────┴─────────────────────────────────┘     │
│                                                                                      │
│ ---                                                                                  │
│ 验证方式                                                                             │
│                                                                                      │
│ 1. 文档完整性：所有计划的文件都已创建                                                │
│ 2. Mermaid 可渲染：所有图表可在 GitHub/VSCode 正确显示                               │
│ 3. 技术版本合理：使用的版本在2026年应是稳定版本                                      │
│ 4. 交叉引用正确：文档间的链接有效     