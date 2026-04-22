'use client';

import { useEffect, useMemo, useState } from 'react';
import { ListTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface TocItem {
    id: string;
    text: string;
    level: 1 | 2 | 3;
}

interface TableOfContentsProps {
    contentVersion: string;
}

function slugifyHeading(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5- ]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 48);
}

export function TableOfContents({ contentVersion }: TableOfContentsProps) {
    const [items, setItems] = useState<TocItem[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        let observer: IntersectionObserver | null = null;
        const frameId = window.requestAnimationFrame(() => {
            const container = document.querySelector('[data-doc-content]');
            if (!container) {
                setItems([]);
                setActiveId(null);
                return;
            }

            const headingNodes = Array.from(
                container.querySelectorAll<HTMLHeadingElement>('h1, h2, h3')
            );

            const nextItems = headingNodes
                .map((node, index) => {
                    const level = Number(node.tagName[1]) as 1 | 2 | 3;
                    const text = node.textContent?.trim() || '';
                    if (!text) return null;

                    if (!node.id) {
                        const suffix = `${index + 1}`;
                        node.setAttribute('id', `${slugifyHeading(text) || 'section'}-${suffix}`);
                    }

                    return {
                        id: node.id,
                        text,
                        level,
                    } satisfies TocItem;
                })
                .filter((item): item is TocItem => Boolean(item));

            setItems(nextItems);

            if (nextItems.length === 0) {
                setActiveId(null);
                return;
            }

            observer = new IntersectionObserver(
                (entries) => {
                    const visible = entries
                        .filter((entry) => entry.isIntersecting)
                        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
                    if (visible[0]?.target.id) {
                        setActiveId(visible[0].target.id);
                    }
                },
                {
                    root: container.closest('[data-doc-scroll-root]'),
                    rootMargin: '-80px 0px -60% 0px',
                    threshold: [0.1, 0.5, 1],
                }
            );

            headingNodes.forEach((heading) => observer?.observe(heading));
        });

        return () => {
            window.cancelAnimationFrame(frameId);
            observer?.disconnect();
        };
    }, [contentVersion]);

    const tocTitle = useMemo(() => `目录 (${items.length})`, [items.length]);

    return (
        <aside className="hidden xl:flex w-64 border-l border-border bg-card/70 flex-col">
            <div className="h-14 border-b border-border px-4 flex items-center gap-2">
                <ListTree className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{tocTitle}</p>
            </div>
            <ScrollArea className="flex-1">
                {items.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">暂无目录结构</p>
                ) : (
                    <nav className="p-2 space-y-1">
                        {items.map((item) => (
                            <Button
                                key={item.id}
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start h-8 text-xs',
                                    item.level === 2 && 'pl-6',
                                    item.level === 3 && 'pl-10',
                                    activeId === item.id && 'bg-secondary text-foreground'
                                )}
                                onClick={() => {
                                    document
                                        .getElementById(item.id)
                                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                            >
                                <span className="truncate">{item.text}</span>
                            </Button>
                        ))}
                    </nav>
                )}
            </ScrollArea>
        </aside>
    );
}
