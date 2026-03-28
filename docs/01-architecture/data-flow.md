# 数据流向设计

## 概述

本文档描述协同文档编辑系统中数据的流动方式，包括：

- 客户端与服务端的同步流程
- Yjs 更新的传播机制
- 版本快照的创建与恢复
- Awareness 状态的广播

## 数据流总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                          数据流向图                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  用户输入                                                            │
│     │                                                               │
│     ▼                                                               │
│  ┌──────┐    ┌──────────┐    ┌─────────────┐    ┌──────────┐      │
│  │Tiptap│───▶│ Y.Doc    │───▶│ WebSocket   │───▶│Hocuspocus│      │
│  │Editor│    │(本地状态) │    │ Provider    │    │  Server  │      │
│  └──────┘    └──────────┘    └─────────────┘    └──────────┘      │
│     │                                                 │            │
│     │              ┌──────────────────────────────────┘            │
│     │              │                                               │
│     │              ▼                                               │
│     │        ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│     │        │  Redis   │◀──▶│PostgreSQL│    │  其他    │        │
│     │        │ (PubSub) │    │ (持久化) │    │  客户端  │        │
│     │        └──────────┘    └──────────┘    └──────────┘        │
│     │              │                           │                  │
│     └──────────────┴───────────────────────────┘                  │
│                  UI 更新（通过 Yjs 观察者）                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 实时编辑数据流

### 1. 本地编辑流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant T as Tiptap Editor
    participant Y as Y.Doc (本地)
    participant P as WebSocket Provider

    U->>T: 输入文本 "Hello"
    T->>Y: Y.Text.insert(5, "Hello")
    Y->>Y: 更新本地状态
    Y->>P: 触发 update 事件
    P->>P: 编码为二进制格式
```

### 2. 同步到服务端

```mermaid
sequenceDiagram
    participant P as WebSocket Provider
    participant W as WebSocket
    participant H as Hocuspocus
    participant R as Redis PubSub
    participant DB as PostgreSQL

    P->>W: 发送 Binary Update
    W->>H: 接收消息
    H->>H: 解码并应用到 Y.Doc

    Note over H: 广播给同一房间其他客户端
    H->>R: 发布到 channel:document:{id}
    R-->>H: 其他实例接收
    H-->>W: 广播给连接的客户端

    Note over H: 防抖持久化
    H->>DB: UPDATE documents SET content = ?
```

### 3. 接收远程更新

```mermaid
sequenceDiagram
    participant H as Hocuspocus
    participant W as WebSocket
    participant P as WebSocket Provider
    participant Y as Y.Doc (本地)
    participant T as Tiptap Editor

    H->>W: 广播 Binary Update
    W->>P: 接收消息
    P->>Y: Y.Doc.applyUpdate(update)
    Y->>T: 触发 observer
    T->>T: 更新编辑器内容
```

## 版本管理数据流

### 版本快照创建

```mermaid
flowchart TD
    A[编辑操作累积] --> B{达到阈值?}
    B -->|否| A
    B -->|是 / 手动触发| C[提取 State Vector]
    C --> D[计算 SHA-256 哈希]
    D --> E{哈希已存在?}
    E -->|是，跳过| A
    E -->|否| F[创建 Version 记录]
    F --> G[存储 stateVector + blob]
    G --> H[记录到版本历史]
    H --> A

    style A fill:#e1f5fe
    style F fill:#c8e6c9
```

### 版本恢复流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant FE as 前端
    participant API as Version API
    participant H as Hocuspocus
    participant DB as PostgreSQL

    U->>FE: 点击"恢复到此版本"
    FE->>API: POST /versions/{id}/restore
    API->>DB: 查询 Version 快照
    DB-->>API: 返回 snapshot + stateVector

    API->>API: 计算差异（当前 vs 目标）
    API->>API: 生成逆向 Update

    API->>H: 通过内部通道发送 Update
    H->>H: 应用到 Y.Doc
    H-->>FE: 广播给所有客户端

    FE->>FE: 编辑器自动更新
```

## Awareness 数据流

### 状态广播

```mermaid
sequenceDiagram
    participant C1 as 客户端 A
    participant H as Hocuspocus
    participant C2 as 客户端 B
    participant R as Redis

    Note over C1,C2: 用户 A 移动光标
    C1->>H: 发送 Awareness Update
    H->>H: 更新本地 Awareness Map
    H->>R: 发布到 awareness:{docId}
    R-->>H: 其他实例接收
    H-->>C2: 广播 Awareness Update
    C2->>C2: 显示用户 A 的光标位置
```

### Awareness 数据结构

```typescript
interface AwarenessState {
    // 用户信息
    clientId: number;
    user: {
        id: string;
        name: string;
        color: string;
        avatar?: string;
    };

    // 编辑状态
    cursor?: {
        from: number;
        to: number;
    };

    selection?: {
        from: number;
        to: number;
        anchor: number;
        head: number;
    };

    // 元数据
    isEditing: boolean;
    lastActive: number;
}
```

## 认证数据流

### JWT 认证流程

```mermaid
sequenceDiagram
    participant C as 客户端
    participant A as Auth API
    participant J as JWT Service
    participant R as Redis
    participant H as Hocuspocus

    Note over C,H: 登录流程
    C->>A: POST /auth/login (email, password)
    A->>A: 验证凭证（bcrypt）
    A->>J: 生成 accessToken + refreshToken
    J-->>A: Tokens
    A->>R: 存储 refreshToken (TTL: 7d)
    A-->>C: { accessToken, refreshToken }

    Note over C,H: WebSocket 认证
    C->>H: WebSocket 连接 + token 参数
    H->>J: 验证 accessToken
    J-->>H: User Payload
    H->>H: 设置连接上下文
    H-->>C: 连接成功
```

### Token 刷新

```mermaid
sequenceDiagram
    participant C as 客户端
    participant A as Auth API
    participant R as Redis

    C->>A: POST /auth/refresh (refreshToken)
    A->>R: 验证 refreshToken
    R-->>A: 有效
    A->>A: 生成新的 accessToken
    A-->>C: { accessToken }

    Note over C,A: refreshToken 过期处理
    A->>A: 清除 Redis 中的 token
    A-->>C: 401 Unauthorized
    C->>C: 重定向到登录页
```

## 数据持久化策略

### 写入策略

| 场景         | 策略     | 说明               |
| ------------ | -------- | ------------------ |
| **实时编辑** | 防抖写入 | 2 秒无新变更后写入 |
| **版本快照** | 立即写入 | 用户主动创建时     |
| **用户断开** | 立即写入 | 确保数据不丢失     |
| **服务关闭** | 优雅关闭 | 等待所有写入完成   |

### 写入流程

```typescript
// Hocuspocus 钩子配置
const server = Server.configure({
    async onStoreDocument({ documentName, document, context }) {
        const state = Buffer.from(encodeStateAsUpdate(document));

        // 使用乐观锁防止并发写入
        const lockKey = `lock:document:${documentName}`;
        const acquired = await redis.set(lockKey, '1', 'PX', 5000, 'NX');

        if (!acquired) {
            // 等待锁释放或超时
            await waitForLock(lockKey, 3000);
        }

        try {
            await prisma.document.update({
                where: { id: documentName },
                data: {
                    content: state,
                    updatedAt: new Date(),
                },
            });
        } finally {
            await redis.del(lockKey);
        }
    },
});
```

## 错误处理与重试

### 客户端重试策略

```typescript
// 指数退避重连
const reconnectConfig = {
    maxRetries: 10,
    baseDelay: 1000, // 1 秒
    maxDelay: 30000, // 30 秒
    backoffFactor: 1.5,
};

function calculateDelay(attempt: number): number {
    const delay = Math.min(
        reconnectConfig.maxDelay,
        reconnectConfig.baseDelay * Math.pow(reconnectConfig.backoffFactor, attempt)
    );
    return delay + Math.random() * 1000; // 添加抖动
}
```

### 离线编辑同步

```mermaid
stateDiagram-v2
    [*] --> Online

    Online --> Offline: 网络断开
    Offline --> Online: 网络恢复

    state Offline {
        [*] --> 继续编辑
        继续编辑 --> 本地累积
        本地累积 --> 等待重连
    }

    state Online {
        [*] --> 实时同步
    }

    Online --> 同步离线变更: 重连成功
    同步离线变更 --> Online
```

## 性能优化数据流

### 增量同步

```typescript
// 只同步差异部分
interface SyncRequest {
    documentId: string;
    clientStateVector: number[]; // 客户端已知状态
}

interface SyncResponse {
    update: Uint8Array | null; // 增量更新
    fullSync: boolean; // 是否需要全量同步
}

// 服务端逻辑
async function handleSync(request: SyncRequest): Promise<SyncResponse> {
    const document = await loadDocument(request.documentId);
    const serverStateVector = encodeStateVector(document);

    const clientSV = new Uint8Array(request.clientStateVector);

    // 检查是否需要全量同步
    if (!isStateVectorCompatible(clientSV, serverStateVector)) {
        return {
            update: encodeStateAsUpdate(document),
            fullSync: true,
        };
    }

    // 增量同步
    const diff = encodeStateAsUpdate(document, clientSV);
    return {
        update: diff,
        fullSync: false,
    };
}
```

### 压缩传输

```typescript
// 使用 zlib 压缩大更新
import { deflateSync, inflateSync } from 'zlib';

function compressUpdate(update: Uint8Array): Buffer {
    if (update.length > 1024) {
        return deflateSync(Buffer.from(update));
    }
    return Buffer.from(update);
}

function decompressUpdate(data: Buffer): Uint8Array {
    // 尝试解压，失败则返回原数据
    try {
        return inflateSync(data);
    } catch {
        return data;
    }
}
```

## 相关文档

- [协同机制总览](../05-collaboration/README.md)
- [版本管理逻辑](../04-backend/version-management.md)
- [WebSocket 网关](../04-backend/hocuspocus-gateway.md)
