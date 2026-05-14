'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { SortableTree } from './sortable-tree';

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
    const { filteredDocuments, counts, fetchDocuments, createDocument, moveDocument } =
        useDocuments();
    const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
    const toggleSidebar = useUIStore((state) => state.toggleSidebar);
    const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
    const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
    const [creatingRoot, setCreatingRoot] = useState(false);
    const initialExpandDone = useRef(false);

    useEffect(() => {
        void fetchDocuments();
    }, [fetchDocuments]);

    useEffect(() => {
        const handler = () => void fetchDocuments();
        window.addEventListener('documents-changed', handler);
        return () => window.removeEventListener('documents-changed', handler);
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

    // 首次加载：展开根节点 + 活动文档的祖先路径
    useEffect(() => {
        if (initialExpandDone.current) return;
        const allDocs = Object.values(filteredDocuments).flat();
        if (allDocs.length === 0) return;

        initialExpandDone.current = true;
        const initial: Record<string, boolean> = {};

        // 根级节点默认展开
        for (const doc of allDocs) {
            if (!doc.parentId) {
                initial[doc.id] = true;
            }
        }

        // 活动文档的祖先路径展开
        if (activeDocumentId) {
            let current = parentById.get(activeDocumentId);
            while (current) {
                initial[current] = true;
                current = parentById.get(current) ?? null;
            }
        }

        setExpandedNodes(initial);
    }, [filteredDocuments, activeDocumentId, parentById]);

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

    const handleCreateRootDoc = async () => {
        try {
            setCreatingRoot(true);
            const doc = await createDocument({ title: '未命名文档' });
            router.push(`/documents/${doc.id}/edit`);
            toast.success('已创建顶层文档');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '创建文档失败');
        } finally {
            setCreatingRoot(false);
        }
    };

    const handleMove = async (
        id: string,
        data: { parentId?: string | null; position?: number }
    ) => {
        try {
            await moveDocument(id, data);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '移动文档失败');
            void fetchDocuments();
        }
    };

    const handleToggleExpand = (id: string) => {
        setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const renderTree = (nodes: DocumentTreeNode[], level: number): ReactElement[] =>
        nodes.map((node) => {
            const hasChildren = node.children.length > 0;
            const isExpanded = expandedNodes[node.id] ?? false;
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
                                                [node.id]: !prev[node.id],
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
                            <div key={section.key} className="space-y-1 group/mine-section">
                                <div className="flex items-center gap-0.5 pr-0">
                                    <Button
                                        variant="ghost"
                                        className="h-9 min-w-0 flex-1 justify-between px-2 text-muted-foreground hover:text-foreground"
                                        onClick={() =>
                                            setExpanded((prev) => ({
                                                ...prev,
                                                [section.key]: !prev[section.key],
                                            }))
                                        }
                                    >
                                        <span className="inline-flex min-w-0 items-center gap-2 truncate text-sm">
                                            <Icon className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{section.label}</span>
                                        </span>
                                        <span className="inline-flex shrink-0 items-center gap-1 text-xs">
                                            <span>{counts[section.key]}</span>
                                            {sectionOpen ? (
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            ) : (
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            )}
                                        </span>
                                    </Button>
                                </div>

                                {sectionOpen && (
                                    <div className="space-y-0.5 pl-2">
                                        {section.key === 'mine' ? (
                                            <>
                                                {treeNodes.length === 0 ? (
                                                    <p className="px-2 py-1 text-xs text-muted-foreground">
                                                        暂无文档
                                                    </p>
                                                ) : (
                                                    <SortableTree
                                                        treeNodes={treeNodes}
                                                        activeDocumentId={activeDocumentId}
                                                        expandedNodes={expandedNodes}
                                                        creatingParentId={creatingParentId}
                                                        onNavigate={(id) =>
                                                            router.push(`/documents/${id}`)
                                                        }
                                                        onToggleExpand={handleToggleExpand}
                                                        onCreateChild={(id) =>
                                                            void handleCreateChild(id)
                                                        }
                                                        onMove={handleMove}
                                                    />
                                                )}
                                                <div className="flex items-center max-h-0 overflow-hidden group-hover/mine-section:max-h-8 transition-[max-height] duration-200">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 shrink-0"
                                                        title="新建文档"
                                                        disabled={creatingRoot}
                                                        aria-label="新建文档"
                                                        onClick={() => void handleCreateRootDoc()}
                                                    >
                                                        {creatingRoot ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Plus className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                    <span className="text-xs text-muted-foreground ml-0.5 select-none">
                                                        新建文档
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {treeNodes.length === 0 ? (
                                                    <p className="px-2 py-1 text-xs text-muted-foreground">
                                                        暂无文档
                                                    </p>
                                                ) : (
                                                    <div>{renderTree(treeNodes, 0)}</div>
                                                )}
                                            </>
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
