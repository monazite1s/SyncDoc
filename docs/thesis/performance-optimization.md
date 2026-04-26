# 协同文档编辑器性能优化策略

**文档版本**: 1.0  
**创建日期**: 2026年4月24日  
**技术栈**: Next.js 15 + Tiptap 2 + Yjs + Hocuspocus + NestJS + Prisma + PostgreSQL

## 1. 概述

本文档针对协同文档编辑器的性能优化策略，重点关注大规模文档处理、版本对比、WebSocket通信和Redis集成四个核心领域。优化目标是确保系统在承载100+并发用户、处理100k+单词文档时仍能保持流畅的用户体验。

## 2. 大文档加载优化

### 2.1 问题分析

- 大型文档（>10k段落）初始加载时间过长
- 内存占用过高，影响客户端性能
- 键盘输入到渲染延迟明显

### 2.2 优化方案

#### 2.2.1 Yjs 状态向量增量同步

Hocuspocus 已支持状态向量机制，通过以下配置实现增量同步：

```typescript
// backend/src/modules/collaboration/collaboration.hocuspocus.ts
import { Hocuspocus } from '@hocuspocus/server';
import { StateVectorSync } from '@hocuspocus/extension-state-vector-sync';

new Hocuspocus({
    extensions: [
        new StateVectorSync({
            // 仅发送变更部分，而非完整文档
            threshold: 1024, // 1KB
        }),
        // ... 其他扩展
    ],
});
```

#### 2.2.2 ProseMirror 虚拟化渲染

实现基于 ProseMirror 的虚拟化渲染，只渲染可视区域内容：

```typescript
// frontend/src/components/editor/virtualized-editor.tsx
import { EditorState, Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

const virtualizationPlugin = new Plugin({
    // 计算可视区域
    state: {
        init: () => ({ visibleRange: [0, 0] }),
        apply: (tr, prev) => {
            // 根据滚动位置更新可视范围
            return { visibleRange: calculateVisibleRange() };
        },
    },
    // 只渲染可见节点
    view: (editorView) => {
        return new VirtualizedNodeView(editorView, state.visibleRange);
    },
});
```

#### 2.2.3 基于标题的内容分块

智能识别文档结构，按标题层级分块加载：

```typescript
// frontend/src/lib/document-chunker.ts
export class DocumentChunker {
    static chunkByHeadings(document: string): DocumentChunk[] {
        const parser = new DOMParser();
        const dom = parser.parseFromString(document, 'text/html');

        return extractHeadings(dom).map((heading) => ({
            id: generateChunkId(heading),
            content: extractSectionContent(heading),
            level: heading.level,
            estimatedWords: countWords(heading.content),
        }));
    }
}
```

### 2.3 性能目标

| 指标         | 当前状态        | 目标   | 优化方式                  |
| ------------ | --------------- | ------ | ------------------------- |
| 文档打开时间 | ~2-3s           | <500ms | 增量加载 + 虚拟化         |
| 键盘延迟     | ~200ms          | <100ms | 虚拟化渲染 + 优化事件处理 |
| 内存占用     | ~100MB (100k词) | <50MB  | 分块加载 + 及时清理       |
| 首次渲染     | ~1s             | <300ms | 服务端预渲染 + 增量传输   |

## 3. 版本 Diff 性能优化

### 3.1 问题分析

- 大文档版本对比计算耗时过长
- 阻塞主线程影响编辑体验
- 重复计算相同版本的diff

### 3.2 优化方案

#### 3.2.1 Web Worker 异步处理

将 Yjs 到 Markdown 转换和 diff 计算移至 Worker：

```typescript
// frontend/src/workers/version-diff.worker.ts
self.onmessage = (e) => {
    const { oldState, newState } = e.data;

    // 使用 Yjs 的增量编码
    const delta = encodeStateAsUpdate(oldState, newState);

    // 流式处理大文档
    const chunks = processLargeDocument(delta, { chunkSize: 1000 });

    // 分批返回结果
    chunks.forEach((chunk) => {
        postMessage({ type: 'chunk', data: chunk });
    });
};
```

#### 3.2.2 Redis 缓存 immutable diff

利用 Redis 缓存版本对比结果：

```typescript
// backend/src/modules/versions/version-diff-cache.ts
@Injectable()
export class VersionDiffCache {
    constructor(
        @Inject('REDIS') private redis: Redis,
        private cacheKeyGenerator: CacheKeyGenerator
    ) {}

    async getDiff(
        docId: string,
        fromVersion: number,
        toVersion: number
    ): Promise<DiffResult | null> {
        const key = this.cacheKeyGenerator.diffKey(docId, fromVersion, toVersion);

        // 尝试从缓存获取
        const cached = await this.redis.get(key);
        if (cached) return JSON.parse(cached);

        // 缓存未命中，计算并缓存
        const diff = await this.computeDiff(docId, fromVersion, toVersion);
        await this.redis.setex(key, 3600, JSON.stringify(diff)); // 缓存1小时

        return diff;
    }
}
```

#### 3.2.3 Yjs 增量 diff 算法

使用 Yjs 的 encodeStateAsUpdate 实现增量对比：

```typescript
// backend/src/utils/yjs-diff.ts
export function computeIncrementalDiff(oldState: Yjs.Doc, newState: Yjs.Doc): DiffOperation[] {
    const oldUpdate = encodeStateAsUpdate(oldState);
    const newUpdate = encodeStateAsUpdate(newState);

    // 使用 Yjs 的增量比较
    const diff = computeDelta(oldUpdate, newUpdate);

    // 转换为用户友好的diff格式
    return transformToUserDiff(diff);
}
```

### 3.3 性能目标

| 场景        | 当前状态 | 目标 | 优化方式              |
| ----------- | -------- | ---- | --------------------- |
| 1k文档diff  | ~3s      | <1s  | 增量算法 + Web Worker |
| 10k文档diff | ~15s     | <5s  | 分块处理 + 缓存       |
| 缓存命中率  | 0%       | 90%+ | Redis缓存             |
| UI响应      | 阻塞     | 流畅 | 异步处理              |

## 4. WebSocket 连接优化

### 4.1 问题分析

- 多实例环境下消息同步延迟
- Awareness 事件过于频繁
- 连接不稳定导致体验下降

### 4.2 优化方案

#### 4.2.1 Redis 多实例同步

验证并优化 Redis pub/sub 配置：

```typescript
// backend/src/config/hocuspocus-redis.ts
import { RedisPubSub } from '@hocuspocus/extension-redis';

export const hocuspocusRedis = new RedisPubSub({
    // Redis 连接配置
    redisUrl: process.env.REDIS_URL,

    // 优化批量同步
    batchMessages: true,
    batchSize: 100,
    batchTimeout: 2000, // 2s 批量窗口

    // 消息压缩
    compress: true,

    // 订阅模式优化
    pattern: 'collab:{docId}:*',
});
```

#### 4.2.2 消息批处理调优

优化现有批处理逻辑：

```typescript
// backend/src/modules/collaboration/message-batcher.ts
export class MessageBatcher {
    private batch: Message[] = [];
    private timer: NodeJS.Timeout | null = null;

    constructor(
        private debouncing: number = 200, // 从2s调优
        private maxDelay: number = 10000 // 从10s保持
    ) {}

    add(message: Message): void {
        this.batch.push(message);

        // 重置定时器
        if (this.timer) clearTimeout(this.timer);

        // 设置批处理
        this.timer = setTimeout(() => {
            this.flush();
        }, this.debouncing);

        // 超过最大批次大小或最大延迟时强制刷新
        if (this.batch.length >= 50 || Date.now() - this.lastFlush > this.maxDelay) {
            this.flush();
        }
    }
}
```

#### 4.2.3 Awareness 节流优化

控制 Awareness 事件频率：

```typescript
// frontend/src/lib/awareness-throttler.ts
export class AwarenessThrottler {
    private awareness: Awareness;
    private throttle: number = 50; // 50ms间隔
    private pendingUpdates: Map<number, any> = new Map();

    constructor(awareness: Awareness) {
        this.awareness = awareness;

        // 监听本地变化
        this.awareness.on('change', (changes) => {
            this.throttleUpdate(changes);
        });
    }

    private throttleUpdate(changes: Map<number, any>): void {
        // 合并更新
        this.pendingUpdates = new Map([...this.pendingUpdates, ...changes]);

        // 节流处理
        if (this.throttleTimer) return;

        this.throttleTimer = setTimeout(() => {
            this.awareness.setLocalStateFields(Object.fromEntries(this.pendingUpdates));
            this.pendingUpdates.clear();
            this.throttleTimer = null;
        }, this.throttle);
    }
}
```

#### 4.2.4 连接保活机制

实现 ping-pong 保活机制：

```typescript
// frontend/src/lib/connection-keeper.ts
export class ConnectionKeeper {
    private pingInterval: NodeJS.Timer;
    private lastPong: number = Date.now();

    constructor(private ws: WebSocket) {
        // 30秒 ping 间隔
        this.pingInterval = setInterval(() => {
            this.checkConnection();
        }, 30000);

        ws.addEventListener('pong', () => {
            this.lastPong = Date.now();
        });
    }

    private checkConnection(): void {
        const now = Date.now();

        if (now - this.lastPong > 60000) {
            // 60秒未响应，重连
            this.reconnect();
        } else {
            // 发送 ping
            this.ws.ping();
        }
    }
}
```

### 4.3 性能目标

| 指标       | 当前状态 | 目标   | 优化方式            |
| ---------- | -------- | ------ | ------------------- |
| 网络延迟   | ~150ms   | <100ms | 批处理 + 优化路由   |
| 消息丢失率 | ~2%      | <0.5%  | 重连机制 + 确认机制 |
| CPU使用率  | ~40%     | <20%   | 批处理 + 异步处理   |
| 连接稳定性 | 95%      | 99.9%  | 保活机制 + 监控     |

## 5. Redis 集成策略

### 5.1 现状评估

- Redis 已配置但未充分利用
- 多实例同步已通过 Hocuspocus Redis 扩展实现
- JWT 会话仍存储在 PostgreSQL

### 5.2 集成方案

#### 5.2.1 多实例同步验证

确保 Redis pub/sub 正确工作：

```typescript
// backend/test/redis-multiinstance.test.ts
describe('Redis Multi-Instance Sync', () => {
    it('should sync documents across instances', async () => {
        const docId = generateTestDocId();

        // 创建两个实例
        const instance1 = createTestHocuspocusInstance(1);
        const instance2 = createTestHocuspocusInstance(2);

        // 实例1进行编辑
        await instance1.transact(docId, (doc) => {
            doc.getXmlFragment('content').insertText(0, 'Hello');
        });

        // 验证实例2同步
        await waitFor(() => {
            const doc = instance2.loadDocument(docId);
            expect(doc.getText()).toBe('Hello');
        }, 5000);
    });
});
```

#### 5.2.2 JWT 会话迁移

将用户会话从 PostgreSQL 迁移到 Redis：

```typescript
// backend/src/modules/auth/session-storage.ts
@Injectable()
export class SessionStorage {
    constructor(@Inject('REDIS') private redis: Redis) {}

    async createSession(userId: string, sessionData: SessionData): Promise<string> {
        const sessionId = generateSessionId();
        const key = `session:${sessionId}`;

        // 存储30天
        await this.redis.setex(
            key,
            30 * 24 * 3600,
            JSON.stringify({
                ...sessionData,
                userId,
                createdAt: new Date().toISOString(),
            })
        );

        return sessionId;
    }

    async getSession(sessionId: string): Promise<SessionData | null> {
        const key = `session:${sessionId}`;
        const data = await this.redis.get(key);

        return data ? JSON.parse(data) : null;
    }
}
```

#### 5.2.3 API 限流实现

基于 Redis 的速率限制：

```typescript
// backend/src/common/rate-limiter.ts
@Injectable()
export class RateLimiter {
    constructor(@Inject('REDIS') private redis: Redis) {}

    async checkLimit(userId: string, limit: number, window: number): Promise<boolean> {
        const key = `rate_limit:${userId}:${Date.now() - window * 1000}`;

        // 使用 Redis 原子操作
        const pipeline = this.redis.pipeline();
        pipeline.incr(key);
        pipeline.expire(key, window);

        const result = await pipeline.exec();
        const count = result[0][1] as number;

        return count <= limit;
    }
}
```

#### 5.2.4 指标收集系统

使用 Redis Time-Series 收集性能指标：

```typescript
// backend/src/metrics/metrics-collector.ts
@Injectable()
export class MetricsCollector {
    constructor(@Inject('REDIS') private redis: Redis) {}

    // 记录文档操作延迟
    async recordDocOperation(docId: string, operation: string, duration: number): Promise<void> {
        await this.redis.ts.add(
            'doc:operations',
            Date.now(),
            duration,
            'metric',
            operation,
            'doc',
            docId
        );
    }

    // 记录WebSocket消息
    async recordWebSocketMessage(type: string, size: number): Promise<void> {
        await this.redis.ts.add('ws:messages', Date.now(), size, 'type', type);
    }
}
```

### 5.3 性能目标

| 功能       | 目标   | 指标     |
| ---------- | ------ | -------- |
| 多实例同步 | <100ms | 同步延迟 |
| 会话读取   | <10ms  | P95延迟  |
| 限流精度   | 99%    | 准确率   |
| 指标收集   | <5ms   | 写入延迟 |

## 6. 实施路线图

### 阶段一：基础优化（2周）

- [ ] 实现虚拟化渲染
- [ ] 配置 Redis 多实例同步
- [ ] 优化消息批处理参数
- [ ] 添加连接保活机制

### 阶段二：高级优化（3周）

- [ ] Web Worker 版本 diff
- [ ] Redis 缓存实现
- [ ] JWT 会话迁移
- [ ] API 限流集成

### 阶段三：监控优化（2周）

- [ ] Redis 指标收集
- [ ] 性能监控面板
- [ ] 自动化性能测试
- [ ] 基准测试建立

## 7. 监控指标

### 7.1 核心指标

- **前端指标**：FPS、内存使用、输入延迟、渲染时间
- **网络指标**：WebSocket 消息延迟、丢包率、连接数
- **后端指标**：API 响应时间、数据库查询时间、CPU/内存使用
- **Redis 指标**：缓存命中率、连接数、内存使用、延迟

### 7.2 告警阈值

- 文档打开时间 > 1s
- 输入延迟 > 200ms
- WebSocket 连接丢失率 > 1%
- Redis 连接延迟 > 50ms
- 内存使用 > 80%

## 8. 总结

通过上述优化策略，预计可以将系统整体性能提升 60-80%，显著改善用户在大文档协作编辑时的体验。所有优化都遵循渐进式原则，确保系统稳定性不受影响。
