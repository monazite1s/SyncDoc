# Yjs 客户端配置

## 概述

本文档描述 Yjs 客户端的配置，包括 WebSocket Provider、Awareness 协议、离线支持和同步策略。

## 核心概念

### Y.Doc

Yjs 文档是所有共享数据的根容器。

```typescript
import * as Y from 'yjs';

// 创建文档
const ydoc = new Y.Doc();

// 共享类型
const ytext = ydoc.getText('content');
const ymap = ydoc.getMap('metadata');
const yarray = ydoc.getArray('versions');
```

### Provider

Provider 负责 Yjs 文档与服务端的同步。

```typescript
import { WebsocketProvider } from 'y-websocket';

const provider = new WebsocketProvider('wss://collab.example.com', 'document-123', ydoc, {
    connect: true,
    params: { token: 'jwt-token' },
});
```

## Provider 配置

### 基础配置

```typescript
// lib/yjs/provider.ts
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface ProviderConfig {
    documentId: string;
    token: string;
    onSync?: (isSynced: boolean) => void;
    onStatusChange?: (status: ConnectionStatus) => void;
    onError?: (error: Error) => void;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export function createProvider(config: ProviderConfig): {
    ydoc: Y.Doc;
    provider: WebsocketProvider;
} {
    const { documentId, token, onSync, onStatusChange, onError } = config;

    // 创建 Yjs 文档
    const ydoc = new Y.Doc();

    // 创建 WebSocket Provider
    const provider = new WebsocketProvider(process.env.NEXT_PUBLIC_WS_URL!, documentId, ydoc, {
        connect: true,
        params: { token },
    });

    // 连接状态监听
    provider.on('status', (event: { status: ConnectionStatus }) => {
        onStatusChange?.(event.status);
    });

    // 同步状态监听
    provider.on('sync', (isSynced: boolean) => {
        onSync?.(isSynced);
    });

    // 错误处理
    provider.on('connection-error', (error: Error) => {
        onError?.(error);
    });

    return { ydoc, provider };
}
```

### 重连策略

```typescript
// lib/yjs/reconnect.ts
import { WebsocketProvider } from 'y-websocket';

export function setupReconnectStrategy(
    provider: WebsocketProvider,
    options: {
        maxRetries: number;
        baseDelay: number;
        maxDelay: number;
    } = {
        maxRetries: 10,
        baseDelay: 1000,
        maxDelay: 30000,
    }
) {
    let retryCount = 0;

    const reconnect = () => {
        if (retryCount >= options.maxRetries) {
            console.error('Max reconnection attempts reached');
            return;
        }

        const delay = Math.min(options.baseDelay * Math.pow(1.5, retryCount), options.maxDelay);

        retryCount++;

        setTimeout(() => {
            provider.connect();
        }, delay);
    };

    provider.on('connection-close', () => {
        reconnect();
    });

    provider.on('status', (event: { status: string }) => {
        if (event.status === 'connected') {
            retryCount = 0;
        }
    });
}
```

### 认证集成

```typescript
// lib/yjs/auth-provider.ts
import { WebsocketProvider } from 'y-websocket';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/token';

export function createAuthenticatedProvider(documentId: string): WebsocketProvider {
    const ydoc = new Y.Doc();
    let currentToken = getAccessToken();

    const provider = new WebsocketProvider(process.env.NEXT_PUBLIC_WS_URL!, documentId, ydoc, {
        connect: false, // 先不连接，等认证后连接
    });

    // 认证流程
    const authenticate = async () => {
        if (!currentToken) {
            // 尝试刷新 token
            currentToken = await refreshAccessToken();
            if (!currentToken) {
                throw new Error('Authentication required');
            }
        }

        // 连接并认证
        provider.connect();

        // 发送认证消息
        provider.on('open', () => {
            provider.send({
                type: 'auth',
                token: currentToken,
            });
        });
    };

    // 处理认证失败
    provider.on('auth-failed', async () => {
        currentToken = await refreshAccessToken();
        if (currentToken) {
            authenticate();
        } else {
            // 跳转登录
            window.location.href = '/login';
        }
    });

    authenticate();

    return provider;
}
```

## Awareness 协议

### Awareness 概念

Awareness 用于共享临时状态，如光标位置、选区、用户信息等。

```typescript
import { Awareness } from 'y-protocols/awareness';

// Provider 内置 awareness
const awareness = provider.awareness;

// 设置本地状态
awareness.setLocalState({
    user: {
        id: 'user-123',
        name: 'John Doe',
        color: '#3b82f6',
    },
    cursor: {
        from: 10,
        to: 20,
    },
    selection: null,
});

// 监听远程状态变化
awareness.on('change', () => {
    const states = Array.from(awareness.getStates().entries());
    // states = [[clientId, state], ...]
});
```

### Awareness Hook

```typescript
// hooks/use-awareness.ts
import { useEffect, useState } from 'react';
import { Awareness } from 'y-protocols/awareness';

interface UserState {
    clientId: number;
    user: {
        id: string;
        name: string;
        color: string;
    };
    cursor?: {
        from: number;
        to: number;
    };
    selection?: {
        from: number;
        to: number;
    };
}

export function useAwareness(awareness: Awareness | null): UserState[] {
    const [states, setStates] = useState<UserState[]>([]);

    useEffect(() => {
        if (!awareness) return;

        const updateStates = () => {
            const awarenessStates = Array.from(awareness.getStates().entries());
            const userStates: UserState[] = awarenessStates
                .filter(([clientId]) => clientId !== awareness.clientID) // 排除自己
                .map(([clientId, state]) => ({
                    clientId,
                    ...state,
                }));

            setStates(userStates);
        };

        updateStates();
        awareness.on('change', updateStates);

        return () => {
            awareness.off('change', updateStates);
        };
    }, [awareness]);

    return states;
}
```

### 光标同步

```typescript
// hooks/use-cursor-sync.ts
import { useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Awareness } from 'y-protocols/awareness';

export function useCursorSync(editor: Editor | null, awareness: Awareness | null) {
    useEffect(() => {
        if (!editor || !awareness) return;

        const updateCursor = () => {
            const { from, to } = editor.state.selection;

            awareness.setLocalStateField('cursor', {
                from,
                to,
            });
        };

        // 监听编辑器选区变化
        editor.on('selectionUpdate', updateCursor);

        return () => {
            editor.off('selectionUpdate', updateCursor);
        };
    }, [editor, awareness]);
}
```

## 离线支持

### IndexedDB 持久化

```typescript
// lib/yjs/persistence.ts
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

export function setupPersistence(ydoc: Y.Doc, documentId: string): IndexeddbPersistence {
    const persistence = new IndexeddbPersistence(documentId, ydoc);

    persistence.on('synced', () => {
        console.log('Local content synced from IndexedDB');
    });

    return persistence;
}
```

### 离线队列

```typescript
// lib/yjs/offline-queue.ts
import * as Y from 'yjs';

interface QueuedUpdate {
    documentId: string;
    update: Uint8Array;
    timestamp: number;
}

class OfflineQueue {
    private dbName = 'yjs-offline-queue';
    private storeName = 'updates';

    async addUpdate(documentId: string, update: Uint8Array): Promise<void> {
        const db = await this.openDB();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);

        await store.add({
            documentId,
            update,
            timestamp: Date.now(),
        });
    }

    async getPendingUpdates(documentId: string): Promise<QueuedUpdate[]> {
        const db = await this.openDB();
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const index = store.index('documentId');

        return await index.getAll(documentId);
    }

    async clearUpdates(documentId: string): Promise<void> {
        const db = await this.openDB();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const index = store.index('documentId');

        const updates = await index.getAllKeys(documentId);
        for (const key of updates) {
            await store.delete(key);
        }
    }

    private async openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                const store = db.createObjectStore(this.storeName, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                store.createIndex('documentId', 'documentId');
            };
        });
    }
}

export const offlineQueue = new OfflineQueue();
```

### 离线检测与同步

```typescript
// hooks/use-offline-sync.ts
import { useEffect, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import { offlineQueue } from '@/lib/yjs/offline-queue';

export function useOfflineSync(provider: WebsocketProvider | null, documentId: string) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (!provider) return;

        // 在线时同步离线队列
        if (isOnline && provider.synced) {
            syncPendingUpdates();
        }
    }, [provider, isOnline]);

    const syncPendingUpdates = async () => {
        const pending = await offlineQueue.getPendingUpdates(documentId);

        for (const item of pending) {
            // 重新发送更新
            provider?.send(item.update);
        }

        // 清除已同步的更新
        await offlineQueue.clearUpdates(documentId);
    };

    return { isOnline };
}
```

## 同步策略

### 增量同步

```typescript
// lib/yjs/sync.ts
import * as Y from 'yjs';

// 获取状态向量
export function getStateVector(ydoc: Y.Doc): Uint8Array {
    return Y.encodeStateVector(ydoc);
}

// 获取差异更新
export function getDiffUpdate(ydoc: Y.Doc, stateVector: Uint8Array): Uint8Array {
    return Y.encodeStateAsUpdate(ydoc, stateVector);
}

// 应用更新
export function applyUpdate(ydoc: Y.Doc, update: Uint8Array): void {
    Y.applyUpdate(ydoc, update);
}

// 合并文档
export function mergeDocs(source: Y.Doc, target: Y.Doc): void {
    const update = Y.encodeStateAsUpdate(source);
    Y.applyUpdate(target, update);
}
```

### 版本快照

```typescript
// lib/yjs/snapshot.ts
import * as Y from 'yjs';
import { snapshot, isVisible } from 'yjs';

// 创建快照
export function createSnapshot(ydoc: Y.Doc): {
    snapshot: Uint8Array;
    stateVector: Uint8Array;
} {
    const sv = Y.encodeStateVector(ydoc);
    const snap = snapshot(ydoc);

    return {
        snapshot: snap,
        stateVector: sv,
    };
}

// 从快照恢复
export function restoreFromSnapshot(
    ydoc: Y.Doc,
    snapshot: Uint8Array,
    stateVector: Uint8Array
): Uint8Array {
    // 计算需要删除的内容
    const currentSv = Y.encodeStateVector(ydoc);
    const diff = Y.encodeStateAsUpdate(ydoc, stateVector);

    // 创建逆向更新
    // 注意：这是简化版，实际需要更复杂的逻辑
    return diff;
}
```

## 性能优化

### 更新批处理

```typescript
// lib/yjs/batch.ts
import * as Y from 'yjs';

export function batchUpdates(ydoc: Y.Doc, updates: Uint8Array[]): void {
    Y.transact(ydoc, () => {
        updates.forEach((update) => {
            Y.applyUpdate(ydoc, update);
        });
    });
}
```

### 大文档优化

```typescript
// lib/yjs/large-doc.ts
import * as Y from 'yjs';

// 分块加载
export async function loadLargeDocument(
    documentId: string,
    chunkSize: number = 1024 * 1024 // 1MB
): Promise<Y.Doc> {
    const ydoc = new Y.Doc();

    // 分块获取数据
    let offset = 0;
    while (true) {
        const chunk = await fetchChunk(documentId, offset, chunkSize);
        if (!chunk || chunk.length === 0) break;

        Y.applyUpdate(ydoc, chunk);
        offset += chunk.length;
    }

    return ydoc;
}

async function fetchChunk(
    documentId: string,
    offset: number,
    size: number
): Promise<Uint8Array | null> {
    const response = await fetch(
        `/api/documents/${documentId}/chunk?offset=${offset}&size=${size}`
    );

    if (!response.ok) return null;

    return new Uint8Array(await response.arrayBuffer());
}
```

## 相关文档

- [Tiptap 编辑器集成](./tiptap-integration.md)
- [CRDT 与 Yjs 原理](../05-collaboration/crdt-yjs.md)
- [Awareness 协议](../05-collaboration/awareness-protocol.md)
