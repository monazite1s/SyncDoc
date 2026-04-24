'use client';

import { useState, useMemo, useCallback } from 'react';
import { documentsApi } from '@/lib/api/documents';
import type { DocumentListItem, CollaboratorRole } from '@collab/types';
import { useAuthStore } from '@/stores/auth.store';

export type DocumentFilter = 'all' | 'mine' | 'shared' | 'archived';
export interface DocumentTreeNode extends DocumentListItem {
    children: DocumentTreeNode[];
}

export function buildDocumentTree(documents: DocumentListItem[]): DocumentTreeNode[] {
    const nodeMap = new Map<string, DocumentTreeNode>();
    const roots: DocumentTreeNode[] = [];

    for (const doc of documents) {
        nodeMap.set(doc.id, { ...doc, children: [] });
    }

    for (const doc of documents) {
        const node = nodeMap.get(doc.id);
        if (!node) continue;

        const parentId = doc.parentId ?? null;
        if (!parentId) {
            roots.push(node);
            continue;
        }

        const parent = nodeMap.get(parentId);
        if (!parent) {
            roots.push(node);
            continue;
        }

        parent.children.push(node);
    }

    const sortNodes = (nodes: DocumentTreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.position !== b.position) return a.position - b.position;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        nodes.forEach((node) => sortNodes(node.children));
    };

    sortNodes(roots);
    return roots;
}

export function useDocuments() {
    const [documents, setDocuments] = useState<DocumentListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const userId = useAuthStore((s) => s.user?.id);

    // 获取文档列表
    const fetchDocuments = useCallback(async (search?: string) => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await documentsApi.getAll(search);
            setDocuments(response.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '获取文档列表失败');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 本地过滤文档
    const filteredDocuments = useMemo(() => {
        return {
            all: documents.filter((d) => d.status !== 'DELETED'),
            mine: documents.filter(
                (d) => d.authorId === userId && d.status !== 'ARCHIVED' && d.status !== 'DELETED'
            ),
            shared: documents.filter(
                (d) =>
                    d.authorId !== userId &&
                    d.userRole !== null &&
                    d.status !== 'ARCHIVED' &&
                    d.status !== 'DELETED'
            ),
            archived: documents.filter((d) => d.status === 'ARCHIVED'),
        };
    }, [documents, userId]);

    // 各分类数量
    const counts = useMemo(
        () => ({
            all: filteredDocuments.all.length,
            mine: filteredDocuments.mine.length,
            shared: filteredDocuments.shared.length,
            archived: filteredDocuments.archived.length,
        }),
        [filteredDocuments]
    );

    // 创建文档
    const createDocument = useCallback(
        async (data: { title: string; description?: string; parentId?: string }) => {
            const response = await documentsApi.create(data);
            const newDoc = response.data;
            setDocuments((prev) => [newDoc, ...prev]);
            return newDoc;
        },
        []
    );

    // 归档文档
    const archiveDocument = useCallback(async (id: string) => {
        const response = await documentsApi.archive(id);
        const updatedDoc = response.data;
        setDocuments((prev) => prev.map((d) => (d.id === id ? updatedDoc : d)));
        return updatedDoc;
    }, []);

    // 恢复文档
    const restoreDocument = useCallback(async (id: string) => {
        const response = await documentsApi.restore(id);
        const updatedDoc = response.data;
        setDocuments((prev) => prev.map((d) => (d.id === id ? updatedDoc : d)));
        return updatedDoc;
    }, []);

    // 删除文档
    const deleteDocument = useCallback(async (id: string) => {
        await documentsApi.delete(id);
        setDocuments((prev) => prev.filter((d) => d.id !== id));
    }, []);

    return {
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
    };
}

// 检查用户是否有编辑权限
export function canEdit(userRole: CollaboratorRole | null): boolean {
    return userRole === 'OWNER' || userRole === 'EDITOR';
}

// 检查用户是否有所有者权限
export function canDelete(userRole: CollaboratorRole | null): boolean {
    return userRole === 'OWNER';
}
