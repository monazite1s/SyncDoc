'use client';

import { cn } from '@/lib/utils';
import type { DocumentFilter } from '@/hooks/use-documents';
import { Button } from '@/components/ui/button';

interface DocumentFiltersProps {
    activeFilter: DocumentFilter;
    onFilterChange: (filter: DocumentFilter) => void;
    counts: Record<DocumentFilter, number>;
}

const tabs: Array<{ key: DocumentFilter; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'mine', label: '我的文档' },
    { key: 'shared', label: '与我共享' },
    { key: 'archived', label: '已归档' },
];

export function DocumentFilters({ activeFilter, onFilterChange, counts }: DocumentFiltersProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => {
                const active = activeFilter === tab.key;
                return (
                    <Button
                        key={tab.key}
                        type="button"
                        onClick={() => onFilterChange(tab.key)}
                        variant="outline"
                        size="sm"
                        className={cn(
                            'h-9 transition-colors whitespace-nowrap',
                            active
                                ? 'border-primary bg-primary/10 text-primary hover:bg-primary/15'
                                : 'border-border bg-card text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {tab.label}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                            ({counts[tab.key]})
                        </span>
                    </Button>
                );
            })}
        </div>
    );
}
