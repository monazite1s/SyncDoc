'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertCircle, Lock } from 'lucide-react';
import { documentsApi } from '@/lib/api/documents';
import { base64ToHtml } from '@/lib/editor/yjs-to-html';
import type { DocumentViewContent } from '@collab/types';
import { Button } from '@/components/ui/button';
import { ViewerHeader } from './viewer-header';
import { ViewerContent } from './viewer-content';
import { TableOfContents } from './table-of-contents';

interface ViewerPageProps {
    paramsPromise: Promise<{ id: string }>;
}

type ViewerPageState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'forbidden' }
    | { status: 'not-found' }
    | { status: 'ready'; document: DocumentViewContent; contentHtml: string };

export default function ViewerPage({ paramsPromise }: ViewerPageProps) {
    const params = use(paramsPromise);
    const documentId = params.id;
    const router = useRouter();
    const [pageState, setPageState] = useState<ViewerPageState>({ status: 'loading' });

    useEffect(() => {
        let cancelled = false;

        async function loadViewData() {
            try {
                const viewRes = await documentsApi.getView(documentId);

                if (cancelled) return;

                // 将 Base64 编码的 Yjs 状态转换为 HTML
                let contentHtml = '';
                if (viewRes.data.contentBase64) {
                    try {
                        contentHtml = base64ToHtml(viewRes.data.contentBase64);
                    } catch {
                        contentHtml = '<p>内容加载失败</p>';
                    }
                }

                setPageState({
                    status: 'ready',
                    document: viewRes.data,
                    contentHtml,
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

        void loadViewData();
        return () => {
            cancelled = true;
        };
    }, [documentId]);

    if (pageState.status === 'loading') {
        return null;
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

    const { document, contentHtml } = pageState;
    const canEdit = document.userRole === 'OWNER' || document.userRole === 'EDITOR';

    return (
        <div className="h-full flex bg-background">
            <div className="flex-1 min-w-0 flex flex-col">
                <ViewerHeader document={document} canEdit={canEdit} />
                <div className="flex flex-1 min-h-0">
                    <ViewerContent contentHtml={contentHtml} />
                    <TableOfContents contentVersion={contentHtml} />
                </div>
            </div>
        </div>
    );
}
