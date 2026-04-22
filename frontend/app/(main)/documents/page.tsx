'use client';

import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useDocuments, type DocumentFilter } from '@/hooks/use-documents';
import { DocumentTable } from '@/components/documents/document-table';
import { CreateDocumentDialog } from '@/components/documents/create-document-dialog';
import { DeleteDocumentDialog } from '@/components/documents/delete-document-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { DocumentListItem } from '@collab/types';

const filterTitles: Record<DocumentFilter, string> = {
    all: '全部文档',
    mine: '我的文档',
    shared: '与我共享',
    archived: '已归档',
};

export default function DocumentsPage() {
    const [activeFilter, setActiveFilter] = useState<DocumentFilter>('all');
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        document: DocumentListItem | null;
    }>({ open: false, document: null });

    const {
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

    const handleCreateDocument = async (data: { title: string; description?: string }) => {
        try {
            await createDocument(data);
            toast.success('文档创建成功');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '创建文档失败');
            throw err;
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
                onArchive={(id) => void handleArchive(id)}
                onRestore={(id) => void handleRestore(id)}
                onDelete={(id) => {
                    const doc = filteredDocuments[filter].find((item) => item.id === id);
                    if (doc) {
                        setDeleteDialog({ open: true, document: doc });
                    }
                }}
            />
        );
    };

    return (
        <div className="h-full overflow-auto bg-background">
            <div className="px-6 py-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">文档中心</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            最近访问、归我所有、共享文档一站管理
                        </p>
                    </div>
                    <CreateDocumentDialog
                        trigger={
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                新建文档
                            </Button>
                        }
                        onSubmit={handleCreateDocument}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            className="pl-9"
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

            {/* 删除确认弹窗 */}
            <DeleteDocumentDialog
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
                documentTitle={deleteDialog.document?.title ?? ''}
                onConfirm={handleDelete}
            />
        </div>
    );
}
