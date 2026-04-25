'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { Editor } from '@tiptap/react';
import { toast } from 'sonner';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3002';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface EditorContextValue {
    ydoc: Y.Doc | null;
    provider: HocuspocusProvider | null;
    editor: Editor | null;
    setEditor: (editor: Editor | null) => void;
    isReadonly: boolean;
    connectionStatus: ConnectionStatus;
    isSynced: boolean;
    reconnect: () => void;
}

const EditorContext = createContext<EditorContextValue>({
    ydoc: null,
    provider: null,
    editor: null,
    setEditor: () => {},
    isReadonly: false,
    connectionStatus: 'connecting',
    isSynced: false,
    reconnect: () => {},
});

export function useEditorContext() {
    return useContext(EditorContext);
}

interface EditorProviderProps {
    documentId: string;
    wsToken: string;
    isReadonly: boolean;
    children: React.ReactNode;
}

export function EditorProvider({ documentId, wsToken, isReadonly, children }: EditorProviderProps) {
    const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
    const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const [isSynced, setIsSynced] = useState(false);
    const [editor, setEditor] = useState<Editor | null>(null);

    const initializedRef = useRef(false);
    const providerRef = useRef<HocuspocusProvider | null>(null);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        // 创建 Yjs 文档
        const doc = new Y.Doc();

        // y-indexeddb 离线持久化：先从本地加载，再与服务器同步
        const persistence = new IndexeddbPersistence(documentId, doc);

        // 创建 Hocuspocus WebSocket provider（含自动重连）
        const hocuspocusProvider = new HocuspocusProvider({
            url: WS_URL,
            name: documentId,
            document: doc,
            token: wsToken,
            onStatus: ({ status }) => {
                if (status === 'connected') {
                    setConnectionStatus('connected');
                } else if (status === 'connecting') {
                    setConnectionStatus((prev) =>
                        prev === 'disconnected' || prev === 'reconnecting'
                            ? 'reconnecting'
                            : 'connecting'
                    );
                } else {
                    setConnectionStatus('disconnected');
                }
            },
            onSynced: () => {
                setIsSynced(true);
            },
            onMessage: (data) => {
                // 监听服务端推送的恢复通知
                const payload = data as unknown as Record<string, unknown> | undefined;
                if (payload && typeof payload === 'object' && 'type' in payload) {
                    const msg = payload as { type: string; message?: string };
                    if (msg.type === 'version-restored') {
                        toast.info(msg.message ?? '文档已被恢复到历史版本');
                    }
                }
            },
            onAuthenticationFailed: () => {
                setConnectionStatus('disconnected');
            },
            onClose: () => {
                setConnectionStatus('disconnected');
            },
        });

        providerRef.current = hocuspocusProvider;
        setYdoc(doc);
        setProvider(hocuspocusProvider);

        // 多标签页检测：BroadcastChannel 通知其他标签页
        const channelId = `collab-editor:${documentId}`;
        let channel: BroadcastChannel | null = null;
        try {
            channel = new BroadcastChannel(channelId);
            channel.postMessage({ type: 'tab-opened' });
            channel.onmessage = (event) => {
                if (event.data?.type === 'tab-opened') {
                    toast.info('您已在其他标签页打开此文档，编辑内容会自动同步。');
                }
            };
        } catch {
            // BroadcastChannel 不可用（旧浏览器），静默降级
        }

        return () => {
            channel?.close();
            hocuspocusProvider.destroy();
            void persistence.destroy();
            doc.destroy();
            setYdoc(null);
            setProvider(null);
            providerRef.current = null;
            initializedRef.current = false;
        };
    }, [documentId, wsToken]);

    // 手动重连
    const reconnect = () => {
        if (providerRef.current) {
            void providerRef.current.connect();
        }
    };

    return (
        <EditorContext.Provider
            value={{
                ydoc,
                provider,
                editor,
                setEditor,
                isReadonly,
                connectionStatus,
                isSynced,
                reconnect,
            }}
        >
            {children}
        </EditorContext.Provider>
    );
}
