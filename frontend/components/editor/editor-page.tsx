'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertCircle, Lock } from 'lucide-react';
import { documentsApi } from '@/lib/api/documents';
import { authApi } from '@/lib/api/auth';
import type { DocumentDetail } from '@collab/types';
import { Button } from '@/components/ui/button';
import { EditorProvider } from './editor-provider';
import { EditorHeader } from './editor-header';
import { EditorDocumentChrome } from './editor-document-chrome';
import { EditorToolbar } from './editor-toolbar';
import { TiptapEditor } from './tiptap-editor';
import { EditorStatusBar } from './editor-status-bar';
import { ConnectionBanner } from './connection-banner';
import { EditorStyles } from './editor-styles';

interface EditorPageProps {
    paramsPromise: Promise<{ id: string }>;
}

type PageState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'forbidden' }
    | { status: 'not-found' }
    | { status: 'ready'; document: DocumentDetail; wsToken: string };

export default function EditorPage({ paramsPromise }: EditorPageProps) {
    const params = use(paramsPromise);
    const documentId = params.id;
    const router = useRouter();
    const [pageState, setPageState] = useState<PageState>({ status: 'loading' });

    useEffect(() => {
        let cancelled = false;

        async function loadEditorData() {
            try {
                // 并行加载文档元信息和 WS token
                const [documentRes, wsTokenRes] = await Promise.all([
                    documentsApi.getById(documentId),
                    authApi.getWsToken(),
                ]);

                if (cancelled) return;

                setPageState({
                    status: 'ready',
                    document: documentRes.data,
                    wsToken: wsTokenRes.data.token,
                });
            } catch (err) {
                if (cancelled) return;

                const error = err as { statusCode?: number; message?: string };
                if (error.statusCode === 403) {
                    setPageState({ status: 'forbidden' });
                } else if (error.statusCode === 404) {
                    setPageState({ status: 'not-found' });
                } else {
                    const message = error.message ?? '加载文档失败，请刷新重试';
                    setPageState({ status: 'error', message });
                    toast.error(message);
                }
            }
        }

        void loadEditorData();
        return () => {
            cancelled = true;
        };
    }, [documentId]);

    if (pageState.status === 'loading') {
        return null; // 路由页已有骨架屏
    }

    if (pageState.status === 'not-found') {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                <div>
                    <p className="text-lg font-medium">文档不存在</p>
                    <p className="text-sm text-muted-foreground mt-1">该文档可能已被删除</p>
                </div>
                <Button variant="outline" onClick={() => router.push('/documents')}>
                    返回文档列表
                </Button>
            </div>
        );
    }

    if (pageState.status === 'forbidden') {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
                <Lock className="h-12 w-12 text-muted-foreground" />
                <div>
                    <p className="text-lg font-medium">无权访问</p>
                    <p className="text-sm text-muted-foreground mt-1">您没有访问此文档的权限</p>
                </div>
                <Button variant="outline" onClick={() => router.push('/documents')}>
                    返回文档列表
                </Button>
            </div>
        );
    }

    if (pageState.status === 'error') {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div>
                    <p className="text-lg font-medium">加载失败</p>
                    <p className="text-sm text-muted-foreground mt-1">{pageState.message}</p>
                </div>
                <Button variant="outline" onClick={() => void window.location.reload()}>
                    重新加载
                </Button>
            </div>
        );
    }

    const { document, wsToken } = pageState;
    const isReadonly = document.userRole === 'VIEWER' || document.userRole === null;

    return (
        <EditorProvider documentId={documentId} wsToken={wsToken} isReadonly={isReadonly}>
            <EditorStyles />
            <div className="h-full flex min-h-0 flex-col overflow-hidden bg-background">
                {/* 上：操作区（全宽） */}
                <EditorHeader document={document} isReadonly={isReadonly} />
                <ConnectionBanner />
                {/* 下：编辑区 — 文档标题/元信息 → 工具栏 → 正文 */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/25">
                    <div className="w-full shrink-0 border-b border-border/60 bg-background px-4 py-4 sm:px-6">
                        <EditorDocumentChrome document={document} isReadonly={isReadonly} />
                    </div>
                    <EditorToolbar />
                    <TiptapEditor className="min-h-0 flex-1 bg-background" />
                </div>
                <EditorStatusBar isReadonly={isReadonly} />
            </div>
        </EditorProvider>
    );
}
