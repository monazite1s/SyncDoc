'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    ChevronRightSquare,
    FileText,
    FolderKanban,
    FolderOpen,
    Settings,
    Share2,
    Archive,
} from 'lucide-react';
import type { DocumentFilter } from '@/hooks/use-documents';
import { useDocuments } from '@/hooks/use-documents';
import { useUIStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
    currentDocumentId?: string;
}

type SidebarSection = {
    key: DocumentFilter;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
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
    const { filteredDocuments, counts, fetchDocuments } = useDocuments();
    const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
    const toggleSidebar = useUIStore((state) => state.toggleSidebar);
    const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);

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

    return (
        <aside
            className={cn(
                'h-full border-r border-border bg-card/95 backdrop-blur transition-[width] duration-200',
                sidebarCollapsed ? 'w-16' : 'w-64'
            )}
        >
            <div className="h-14 border-b border-border px-3 flex items-center justify-between">
                {sidebarCollapsed ? (
                    <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                        <FolderKanban className="h-4 w-4" />
                    </div>
                ) : (
                    <Link
                        href="/documents"
                        className="text-sm font-semibold text-foreground truncate"
                    >
                        Collab Editor
                    </Link>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleSidebar}
                    aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
                >
                    {sidebarCollapsed ? (
                        <ChevronRightSquare className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </Button>
            </div>

            <ScrollArea className="h-[calc(100%-56px)]">
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
                        const docs = filteredDocuments[section.key];

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
                                        {docs.length === 0 ? (
                                            <p className="px-2 py-1 text-xs text-muted-foreground">
                                                暂无文档
                                            </p>
                                        ) : (
                                            docs.slice(0, 30).map((doc) => (
                                                <Button
                                                    key={doc.id}
                                                    variant="ghost"
                                                    className={cn(
                                                        'w-full justify-start h-8 px-2 text-left text-xs',
                                                        activeDocumentId === doc.id &&
                                                            'bg-secondary text-foreground'
                                                    )}
                                                    onClick={() =>
                                                        router.push(`/documents/${doc.id}`)
                                                    }
                                                >
                                                    <FileText className="h-3.5 w-3.5 mr-2 shrink-0" />
                                                    <span className="truncate">{doc.title}</span>
                                                </Button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-3 p-2 border-t border-border/60 space-y-1">
                    <Button
                        variant={pathname.startsWith('/settings') ? 'secondary' : 'ghost'}
                        className={cn(
                            'w-full justify-start gap-2',
                            sidebarCollapsed && 'justify-center px-0'
                        )}
                        onClick={() => router.push('/settings')}
                    >
                        <Settings className="h-4 w-4" />
                        {!sidebarCollapsed && <span>设置</span>}
                    </Button>
                </div>
            </ScrollArea>
        </aside>
    );
}
