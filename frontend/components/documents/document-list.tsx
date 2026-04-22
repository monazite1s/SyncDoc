'use client';

import type { DocumentFilter } from '@/hooks/use-documents';
import type { DocumentListItem } from '@collab/types';
import { DocumentListItemRow } from './document-list-item';

interface DocumentListProps {
    documents: DocumentListItem[];
    filterType: DocumentFilter;
    onArchive: (id: string) => void;
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
}

const emptyMessages: Record<DocumentFilter, { title: string; description: string }> = {
    all: {
        title: '还没有任何文档',
        description: '点击右上角“新建文档”，开始创建第一篇文档',
    },
    mine: {
        title: '暂无我创建的文档',
        description: '您创建的文档会显示在这里',
    },
    shared: {
        title: '暂无共享文档',
        description: '其他人共享给您的文档会显示在这里',
    },
    archived: {
        title: '暂无已归档文档',
        description: '归档后的文档会显示在这里',
    },
};

export function DocumentList({
    documents,
    filterType,
    onArchive,
    onRestore,
    onDelete,
}: DocumentListProps) {
    if (documents.length === 0) {
        const empty = emptyMessages[filterType];
        return (
            <div className="h-full flex items-center justify-center text-center p-8">
                <div>
                    <p className="text-lg font-medium">{empty.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{empty.description}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
            {documents.map((document) => (
                <DocumentListItemRow
                    key={document.id}
                    document={document}
                    onArchive={onArchive}
                    onRestore={onRestore}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}
