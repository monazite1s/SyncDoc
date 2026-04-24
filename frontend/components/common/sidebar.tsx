'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactElement } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    ChevronRightSquare,
    FileText,
    FolderOpen,
    Share2,
    Archive,
    Plus,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DocumentFilter, DocumentTreeNode } from '@/hooks/use-documents';
import { buildDocumentTree, useDocuments } from '@/hooks/use-documents';
import { useUIStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
    currentDocumentId?: string;
}

type SidebarSection = {
    key: Exclude<DocumentFilter, 'all'>;
    label: string;
    icon: ComponentType<{ className?: string }>;
};

const sections: SidebarSection[] = [
    { key: 'mine', label: '我的文档', icon: FolderOpen },
    { key: 'shared', label: '与我共享', icon: Share2 },
    { key: 'archived', label: '已归档', icon: Archive },
];

export function Sidebar({ currentDocumentId }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [expanded, setExpanded] = useState<Record<DocumentFilter, boolean>>({
        all: true,
        mine: true,
        shared: true,
        archived: true,
    });
    const { filteredDocuments, counts, fetchDocuments, createDocument } = useDocuments();
    const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
    const toggleSidebar = useUIStore((state) => state.toggleSidebar);
    const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
    const [creatingParentId, setCreatingParentId] = useState<string | null>(null);

    useEffect(() => {
        void fetchDocuments();
    }, [fetchDocuments]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 1024px)');
        const syncMobileCollapsed = (event: MediaQueryListEvent | MediaQueryList) => {
            setSidebarCollapsed(event.matches);
        };

        syncMobileCollapsed(mediaQuery);
        mediaQuery.addEventListener('change', syncMobileCollapsed);

        return () => {
            mediaQuery.removeEventListener('change', syncMobileCollapsed);
        };
    }, [setSidebarCollapsed]);

    const activeDocumentId = useMemo(() => {
        if (currentDocumentId) return currentDocumentId;
        const match = pathname.match(/^\/documents\/([^/]+)/);
        return match?.[1];
    }, [currentDocumentId, pathname]);

    const parentById = useMemo(() => {
        const map = new Map<string, string | null>();
        Object.values(filteredDocuments)
            .flat()
            .forEach((doc) => {
                map.set(doc.id, doc.parentId ?? null);
            });
        return map;
    }, [filteredDocuments]);

    useEffect(() => {
        if (!activeDocumentId) return;
        const expanded: Record<string, boolean> = {};
        let current = parentById.get(activeDocumentId);
        while (current) {
            expanded[current] = true;
            current = parentById.get(current) ?? null;
        }
        if (Object.keys(expanded).length > 0) {
            setExpandedNodes((prev) => ({ ...prev, ...expanded }));
        }
    }, [activeDocumentId, parentById]);

    const treeBySection = useMemo(
        () => ({
            mine: buildDocumentTree(filteredDocuments.mine),
            shared: buildDocumentTree(filteredDocuments.shared),
            archived: buildDocumentTree(filteredDocuments.archived),
        }),
        [filteredDocuments]
    );

    const handleCreateChild = async (parentId: string) => {
        try {
            setCreatingParentId(parentId);
            const doc = await createDocument({ title: '未命名文档', parentId });
            setExpandedNodes((prev) => ({ ...prev, [parentId]: true }));
            router.push(`/documents/${doc.id}/edit`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '创建子文档失败');
        } finally {
            setCreatingParentId(null);
        }
    };

    const renderTree = (nodes: DocumentTreeNode[], level: number): ReactElement[] =>
        nodes.map((node) => {
            const hasChildren = node.children.length > 0;
            const isExpanded =
                expandedNodes[node.id] ??
                (level === 0 || (activeDocumentId ? node.id === activeDocumentId : false));
            const isActive = activeDocumentId === node.id;
            const isCreating = creatingParentId === node.id;

            return (
                <div key={node.id} className="space-y-0.5">
                    <div className="group relative">
                        <Button
                            variant="ghost"
                            className={cn(
                                'w-full h-8 text-left text-xs pr-8',
                                isActive && 'bg-secondary text-foreground'
                            )}
                            style={{ paddingLeft: `${level * 14 + 8}px` }}
                            onClick={() => router.push(`/documents/${node.id}`)}
                        >
                            <span className="inline-flex items-center min-w-0 w-full gap-1.5">
                                {hasChildren ? (
                                    <span
                                        role="button"
                                        aria-label={isExpanded ? '收起子文档' : '展开子文档'}
                                        className="inline-flex h-4 w-4 items-center justify-center rounded hover:bg-muted"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setExpandedNodes((prev) => ({
                                                ...prev,
                                                [node.id]: !(prev[node.id] ?? level === 0),
                                            }));
                                        }}
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        ) : (
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        )}
                                    </span>
                                ) : (
                                    <span className="inline-flex h-4 w-4" />
                                )}
                                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate">{node.title}</span>
                            </span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                'absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity',
                                'group-hover:opacity-100',
                                isCreating && 'opacity-100'
                            )}
                            onClick={(event) => {
                                event.stopPropagation();
                                void handleCreateChild(node.id);
                            }}
                            title="新增子文档"
                            disabled={isCreating}
                        >
                            {isCreating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Plus className="h-3.5 w-3.5" />
                            )}
                        </Button>
                    </div>

                    {hasChildren && isExpanded && <div>{renderTree(node.children, level + 1)}</div>}
                </div>
            );
        });

    return (
        <aside
            className={cn(
                'h-full border-r border-border bg-card/95 backdrop-blur transition-[width] duration-200 flex flex-col',
                sidebarCollapsed ? 'w-16' : 'w-64'
            )}
        >
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-1">
                    <Button
                        variant={pathname === '/documents' ? 'secondary' : 'ghost'}
                        className={cn(
                            'w-full justify-start gap-2',
                            sidebarCollapsed && 'justify-center px-0'
                        )}
                        onClick={() => router.push('/documents')}
                    >
                        <FileText className="h-4 w-4" />
                        {!sidebarCollapsed && <span>最近访问</span>}
                    </Button>

                    <div className="pt-2 border-t border-border/60" />

                    {sections.map((section) => {
                        const Icon = section.icon;
                        const sectionOpen = expanded[section.key];
                        const treeNodes = treeBySection[section.key];

                        if (sidebarCollapsed) {
                            return (
                                <Button
                                    key={section.key}
                                    variant="ghost"
                                    className="w-full justify-center px-0"
                                    onClick={() => router.push('/documents')}
                                >
                                    <Icon className="h-4 w-4" />
                                </Button>
                            );
                        }

                        return (
                            <div key={section.key} className="space-y-1">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-between h-8 px-2 text-muted-foreground hover:text-foreground"
                                    onClick={() =>
                                        setExpanded((prev) => ({
                                            ...prev,
                                            [section.key]: !prev[section.key],
                                        }))
                                    }
                                >
                                    <span className="inline-flex items-center gap-2 text-sm">
                                        <Icon className="h-4 w-4" />
                                        {section.label}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-xs">
                                        {counts[section.key]}
                                        {sectionOpen ? (
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        ) : (
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        )}
                                    </span>
                                </Button>

                                {sectionOpen && (
                                    <div className="space-y-0.5 pl-2">
                                        {treeNodes.length === 0 ? (
                                            <p className="px-2 py-1 text-xs text-muted-foreground">
                                                暂无文档
                                            </p>
                                        ) : (
                                            <div>{renderTree(treeNodes, 0)}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            <div className="border-t border-border p-2">
                <Button
                    variant="ghost"
                    onClick={toggleSidebar}
                    className={cn(
                        'w-full h-10 text-muted-foreground hover:text-foreground',
                        sidebarCollapsed ? 'justify-center px-0' : 'justify-start gap-2.5 px-2'
                    )}
                    aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
                >
                    {sidebarCollapsed ? (
                        <ChevronRightSquare className="h-5 w-5" />
                    ) : (
                        <>
                            <ChevronLeft className="h-5 w-5 shrink-0" />
                            <span className="text-sm">收起</span>
                        </>
                    )}
                </Button>
            </div>
        </aside>
    );
}
