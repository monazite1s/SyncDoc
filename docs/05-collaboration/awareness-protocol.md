# Awareness 协议

## 概述

Awareness 协议用于在协同编辑中共享临时状态，如用户光标位置、选区、在线状态等。与持久化的文档内容不同，Awareness 状态是临时的、实时的。

## 核心概念

### Awareness vs Document

| 特性     | Document (Y.Doc) | Awareness |
| -------- | ---------------- | --------- |
| 持久化   | 是               | 否        |
| 合并     | CRDT 自动合并    | 覆盖更新  |
| 用途     | 文档内容         | 临时状态  |
| 断线重连 | 需要同步         | 重新获取  |

### 状态类型

```typescript
interface AwarenessState {
    // 用户信息
    user: {
        id: string;
        name: string;
        color: string;
        avatar?: string;
    };

    // 光标位置
    cursor?: {
        from: number;
        to: number;
    };

    // 选区
    selection?: {
        anchor: number;
        head: number;
    };

    // 编辑状态
    isEditing: boolean;

    // 元数据
    lastActive: number;
}
```

## 使用方式

### 基础用法

```typescript
import { Awareness } from 'y-protocols/awareness';

// 创建 Awareness 实例
const awareness = new Awareness(ydoc);

// 设置本地状态
awareness.setLocalState({
    user: {
        id: 'user-123',
        name: 'Alice',
        color: '#3b82f6',
    },
    cursor: { from: 10, to: 10 },
});

// 获取所有状态
const states = awareness.getStates();
// Map { clientID => state }

// 监听状态变化
awareness.on('change', (changes) => {
    console.log('Changed:', changes);
});
```

### WebsocketProvider 集成

```typescript
import { WebsocketProvider } from 'y-websocket';

const provider = new WebsocketProvider('wss://server.com', 'document-id', ydoc);

// Provider 内置 awareness
const awareness = provider.awareness;

// 设置状态
awareness.setLocalStateField('user', {
    id: 'user-123',
    name: 'Alice',
    color: '#3b82f6',
});

// 设置光标
awareness.setLocalStateField('cursor', {
    from: 10,
    to: 20,
});
```

### Tiptap 集成

```typescript
import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';

const editor = new Editor({
    extensions: [
        CollaborationCursor.configure({
            provider,
            user: {
                id: 'user-123',
                name: 'Alice',
                color: '#3b82f6',
            },
        }),
    ],
});

// 动态更新用户信息
editor
    .chain()
    .focus()
    .updateUser({
        name: 'Alice Smith',
    })
    .run();
```

## 前端实现

### Awareness Hook

```typescript
// hooks/use-awareness.ts
import { useEffect, useState, useCallback } from 'react';
import { Awareness } from 'y-protocols/awareness';

interface AwarenessUser {
    clientId: number;
    user: {
        id: string;
        name: string;
        color: string;
        avatar?: string;
    };
    cursor?: { from: number; to: number };
    selection?: { anchor: number; head: number };
    isEditing?: boolean;
}

export function useAwareness(awareness: Awareness | null) {
    const [users, setUsers] = useState<AwarenessUser[]>([]);
    const [localState, setLocalState] = useState<any>(null);

    // 更新本地状态
    const updateLocalState = useCallback(
        (state: Partial<AwarenessUser>) => {
            if (!awareness) return;

            const current = awareness.getLocalState() || {};
            awareness.setLocalState({ ...current, ...state });
        },
        [awareness]
    );

    // 更新光标
    const updateCursor = useCallback(
        (from: number, to: number) => {
            updateLocalState({ cursor: { from, to } });
        },
        [updateLocalState]
    );

    // 更新用户信息
    const updateUser = useCallback(
        (user: Partial<AwarenessUser['user']>) => {
            const current = awareness?.getLocalState()?.user || {};
            updateLocalState({ user: { ...current, ...user } });
        },
        [awareness, updateLocalState]
    );

    useEffect(() => {
        if (!awareness) return;

        const updateUsers = () => {
            const states = awareness.getStates();
            const localClientId = awareness.clientID;

            const otherUsers: AwarenessUser[] = [];

            states.forEach((state, clientId) => {
                if (clientId !== localClientId && state.user) {
                    otherUsers.push({
                        clientId,
                        ...state,
                    });
                }
            });

            setUsers(otherUsers);
            setLocalState(awareness.getLocalState());
        };

        updateUsers();
        awareness.on('change', updateUsers);

        return () => {
            awareness.off('change', updateUsers);
        };
    }, [awareness]);

    return {
        users,
        localState,
        updateLocalState,
        updateCursor,
        updateUser,
    };
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
            awareness.setLocalStateField('cursor', { from, to });
        };

        // 监听选区变化
        editor.on('selectionUpdate', updateCursor);

        // 初始化
        updateCursor();

        return () => {
            editor.off('selectionUpdate', updateCursor);
        };
    }, [editor, awareness]);
}
```

### 协作光标渲染

```tsx
// components/collaboration/collaboration-cursors.tsx
import { useEffect, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Awareness } from 'y-protocols/awareness';

interface Cursor {
    userId: string;
    name: string;
    color: string;
    from: number;
    to: number;
}

interface Props {
    editor: Editor;
    awareness: Awareness;
}

export function CollaborationCursors({ editor, awareness }: Props) {
    const [cursors, setCursors] = useState<Cursor[]>([]);

    useEffect(() => {
        const updateCursors = () => {
            const states = awareness.getStates();
            const localClientId = awareness.clientID;
            const newCursors: Cursor[] = [];

            states.forEach((state, clientId) => {
                if (clientId !== localClientId && state.cursor && state.user) {
                    newCursors.push({
                        userId: state.user.id,
                        name: state.user.name,
                        color: state.user.color,
                        from: state.cursor.from,
                        to: state.cursor.to,
                    });
                }
            });

            setCursors(newCursors);
        };

        updateCursors();
        awareness.on('change', updateCursors);

        return () => {
            awareness.off('change', updateCursors);
        };
    }, [awareness]);

    return (
        <>
            {cursors.map((cursor) => (
                <CursorDecoration key={cursor.userId} editor={editor} cursor={cursor} />
            ))}
        </>
    );
}

function CursorDecoration({ editor, cursor }: { editor: Editor; cursor: Cursor }) {
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const updatePosition = () => {
            const coords = editor.view.coordsAtPos(cursor.from);
            setPosition({ top: coords.top, left: coords.left });
        };

        updatePosition();
        editor.on('update', updatePosition);

        return () => {
            editor.off('update', updatePosition);
        };
    }, [editor, cursor.from]);

    return (
        <div
            className="absolute pointer-events-none"
            style={{
                top: position.top,
                left: position.left,
            }}
        >
            {/* 光标线 */}
            <div className="w-0.5 h-5" style={{ backgroundColor: cursor.color }} />
            {/* 用户名标签 */}
            <div
                className="absolute top-[-1.5em] left-0 text-xs text-white px-1 rounded whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
            >
                {cursor.name}
            </div>
        </div>
    );
}
```

### 在线用户展示

```tsx
// components/collaboration/collaborator-avatars.tsx
import { useAwareness } from '@/hooks/use-awareness';

interface Props {
    awareness: Awareness;
    maxVisible?: number;
}

export function CollaboratorAvatars({ awareness, maxVisible = 4 }: Props) {
    const { users } = useAwareness(awareness);

    const visibleUsers = users.slice(0, maxVisible);
    const hiddenCount = users.length - maxVisible;

    return (
        <div className="flex items-center -space-x-2">
            {visibleUsers.map((user) => (
                <div key={user.clientId} className="relative" title={user.user.name}>
                    {user.user.avatar ? (
                        <img
                            src={user.user.avatar}
                            alt={user.user.name}
                            className="w-8 h-8 rounded-full border-2 border-white"
                        />
                    ) : (
                        <div
                            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-sm font-medium"
                            style={{ backgroundColor: user.user.color }}
                        >
                            {user.user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    {/* 在线指示器 */}
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                </div>
            ))}

            {hiddenCount > 0 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-sm">
                    +{hiddenCount}
                </div>
            )}
        </div>
    );
}
```

## 服务端实现

### Hocuspocus Awareness

```typescript
// Hocuspocus 自动处理 Awareness
const server = Server.configure({
    async onConnect({ documentName, context }) {
        // 可以在这里初始化 Awareness 状态
    },

    async onDisconnect({ documentName, context }) {
        // 清理断开用户的状态
        // Hocuspocus 会自动处理
    },
});
```

### Awareness 广播

```typescript
// Awareness 变化通过 WebSocket 广播
// 协议格式：
// [ messageType, updates ]

// messageType:
// 0 = sync
// 1 = awareness update
// 2 = auth

// 客户端发送
const message = new Encoder();
writeVarUint(message, 1); // awareness update
writeVarUint8Array(message, encodeAwarenessUpdate(awareness, [clientId]));

// 服务端广播给其他客户端
```

## 性能优化

### 状态节流

```typescript
// 避免频繁更新
import { throttle } from 'lodash-es';

const throttledUpdateCursor = throttle((from: number, to: number) => {
    awareness.setLocalStateField('cursor', { from, to });
}, 100); // 100ms 节流

editor.on('selectionUpdate', ({ editor }) => {
    const { from, to } = editor.state.selection;
    throttledUpdateCursor(from, to);
});
```

### 状态清理

```typescript
// 断开连接时清理
useEffect(() => {
    return () => {
        // 清理本地状态
        awareness.setLocalState(null);
    };
}, [awareness]);
```

### 状态大小控制

```typescript
// 避免存储大量数据
// ❌ 不好
awareness.setLocalStateField('largeData', hugeArray);

// ✅ 好
awareness.setLocalStateField('user', { id, name, color });
```

## 相关文档

- [CRDT 与 Yjs 原理](./crdt-yjs.md)
- [Tiptap 编辑器集成](../03-frontend/tiptap-integration.md)
- [Hocuspocus 网关](../04-backend/hocuspocus-gateway.md)
