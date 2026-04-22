'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { Editor } from '@tiptap/react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3002';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface EditorContextValue {
    ydoc: Y.Doc | null;
    provider: HocuspocusProvider | null;
    editor: Editor | null;
    setEditor: (editor: Editor | null) => void;
    isReadonly: boolean;
    connectionStatus: ConnectionStatus;
    isSynced: boolean;
}

const EditorContext = createContext<EditorContextValue>({
    ydoc: null,
    provider: null,
    editor: null,
    setEditor: () => {},
    isReadonly: false,
    connectionStatus: 'connecting',
    isSynced: false,
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
    // 使用 state 保证 ydoc/provider 就绪后触发子组件重渲染
    const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
    const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const [isSynced, setIsSynced] = useState(false);
    const [editor, setEditor] = useState<Editor | null>(null);

    // useRef 防止 React Strict Mode 重复创建（dev 模式下 effect 执行两次）
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        // 创建 Yjs 文档
        const doc = new Y.Doc();

        // y-indexeddb 离线持久化：先从本地加载，再与服务器同步
        const persistence = new IndexeddbPersistence(documentId, doc);

        // 创建 Hocuspocus WebSocket provider
        const hocuspocusProvider = new HocuspocusProvider({
            url: WS_URL,
            name: documentId,
            document: doc,
            token: wsToken,
            onStatus: ({ status }) => {
                if (status === 'connected') {
                    setConnectionStatus('connected');
                } else {
                    setConnectionStatus(status as ConnectionStatus);
                }
            },
            onSynced: () => {
                setIsSynced(true);
            },
            onAuthenticationFailed: () => {
                setConnectionStatus('disconnected');
            },
        });

        setYdoc(doc);
        setProvider(hocuspocusProvider);

        return () => {
            hocuspocusProvider.destroy();
            void persistence.destroy();
            doc.destroy();
            setYdoc(null);
            setProvider(null);
            initializedRef.current = false;
        };
    }, [documentId, wsToken]);

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
            }}
        >
            {children}
        </EditorContext.Provider>
    );
}
