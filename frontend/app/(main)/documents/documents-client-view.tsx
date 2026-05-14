'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useDocuments, type DocumentFilter } from '@/hooks/use-documents';
import { DocumentTable } from '@/components/documents/document-table';
import { ShareDialog } from '@/components/documents/share-dialog';
import { DeleteDocumentDialog } from '@/components/documents/delete-document-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { DocumentListItem, DocumentDetail } from '@collab/types';
import { documentsApi } from '@/lib/api/documents';
import { useAuthStore } from '@/stores/auth.store';

const filterTitles: Record<DocumentFilter, string> = {
    all: '全部文档',
    mine: '我的文档',
    shared: '与我共享',
    archived: '已归档',
};

export function DocumentsClientView() {
    const router = useRouter();
    const currentUser = useAuthStore((state) => state.user);
    const [activeFilter, setActiveFilter] = useState<DocumentFilter>('all');
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        document: DocumentListItem | null;
    }>({ open: false, document: null });

    const [shareOpen, setShareOpen] = useState(false);
    const [shareDetail, setShareDetail] = useState<DocumentDetail | null>(null);
    const [shareLoadingId, setShareLoadingId] = useState<string | null>(null);

    const {
        documents,
        filteredDocuments,
        counts,
        isLoading,
        error,
        fetchDocuments,
        createDocument,
        archiveDocument,
        restoreDocument,
        deleteDocument,
    } = useDocuments();

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
        }, 300);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        void fetchDocuments(debouncedSearch || undefined);
    }, [debouncedSearch, fetchDocuments]);

    useEffect(() => {
        if (error) {
            toast.error(error);
        }
    }, [error]);

    const handleCreateDocument = async () => {
        try {
            const newDocument = await createDocument({ title: '未命名文档' });
            toast.success('文档创建成功');
            router.push(`/documents/${newDocument.id}/edit`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '创建文档失败');
        }
    };

    const handleArchive = async (id: string) => {
        try {
            await archiveDocument(id);
            toast.success('文档已归档');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '归档失败');
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await restoreDocument(id);
            toast.success('文档已恢复');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '恢复失败');
        }
    };

    const handleDelete = async () => {
        if (!deleteDialog.document) return;
        try {
            await deleteDocument(deleteDialog.document.id);
            toast.success('文档已删除');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '删除失败');
            throw err;
        }
    };

    /**
     * 文档列表「分享」：拉取详情后打开弹窗（协作者列表仅详情接口返回）
     */
    const handleOpenShare = async (documentId: string) => {
        setShareLoadingId(documentId);
        try {
            const res = await documentsApi.getById(documentId);
            setShareDetail(res.data);
            setShareOpen(true);
        } catch (err) {
            const apiErr = err as { message?: string };
            toast.error(apiErr.message ?? '加载文档信息失败，无法打开分享');
        } finally {
            setShareLoadingId(null);
        }
    };

    const handleShareUpdated = async () => {
        await fetchDocuments(debouncedSearch || undefined);
        if (shareDetail) {
            try {
                const res = await documentsApi.getById(shareDetail.id);
                setShareDetail(res.data);
            } catch {
                // 刷新列表已成功，弹窗内数据可保持
            }
        }
    };

    const renderTableContent = (filter: DocumentFilter) => {
        if (isLoading) {
            return (
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="flex items-center gap-3 py-1">
                            <Skeleton className="h-4 w-4 rounded-sm" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <DocumentTable
                documents={filteredDocuments[filter]}
                allDocuments={documents}
                onArchive={(id) => void handleArchive(id)}
                onRestore={(id) => void handleRestore(id)}
                onDelete={(id) => {
                    const doc = filteredDocuments[filter].find((item) => item.id === id);
                    if (doc) {
                        setDeleteDialog({ open: true, document: doc });
                    }
                }}
                shareLoadingDocumentId={shareLoadingId ?? undefined}
                onShare={(id) => void handleOpenShare(id)}
            />
        );
    };

    return (
        <div className="h-full overflow-auto">
            <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">文档中心</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            最近访问、归我所有、共享文档一站管理
                        </p>
                    </div>
                    <Button onClick={() => void handleCreateDocument()}>
                        <Plus className="h-4 w-4 mr-2" />
                        新建文档
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            className="pl-9 h-9"
                            placeholder="搜索文档..."
                        />
                    </div>
                </div>

                <Tabs
                    value={activeFilter}
                    onValueChange={(value) => setActiveFilter(value as DocumentFilter)}
                    className="space-y-4"
                >
                    <TabsList className="h-10 bg-muted/70">
                        <TabsTrigger value="all">
                            全部文档
                            <span className="ml-1 text-xs text-muted-foreground">
                                ({counts.all})
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="mine">
                            归我所有
                            <span className="ml-1 text-xs text-muted-foreground">
                                ({counts.mine})
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="shared">
                            与我共享
                            <span className="ml-1 text-xs text-muted-foreground">
                                ({counts.shared})
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="archived">
                            已归档
                            <span className="ml-1 text-xs text-muted-foreground">
                                ({counts.archived})
                            </span>
                        </TabsTrigger>
                    </TabsList>

                    {(Object.keys(filterTitles) as DocumentFilter[]).map((filter) => (
                        <TabsContent key={filter} value={filter} className="space-y-3">
                            <h2 className="text-sm font-medium text-muted-foreground">
                                {filterTitles[filter]}
                            </h2>
                            {renderTableContent(filter)}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            {shareDetail ? (
                <ShareDialog
                    documentId={shareDetail.id}
                    isPublic={shareDetail.isPublic}
                    collaborators={shareDetail.collaborators}
                    currentUserId={currentUser?.id ?? ''}
                    currentUserRole={shareDetail.userRole}
                    open={shareOpen}
                    onOpenChange={(open) => {
                        setShareOpen(open);
                        if (!open) {
                            setShareDetail(null);
                        }
                    }}
                    onUpdate={() => void handleShareUpdated()}
                />
            ) : null}

            <DeleteDocumentDialog
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
                documentTitle={deleteDialog.document?.title ?? ''}
                onConfirm={handleDelete}
            />
        </div>
    );
}
