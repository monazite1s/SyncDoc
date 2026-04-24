'use client';

import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { History, Loader2, RefreshCw, Save, Zap } from 'lucide-react';
import { VersionType } from '@collab/types';
import { versionsApi } from '@/lib/api/versions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VersionTimelineProps {
    versions: Awaited<ReturnType<typeof versionsApi.list>>['data']['items'];
    selectedVersion: number | null;
    total: number;
    totalLoaded: number;
    hasMore: boolean;
    isLoadingMore: boolean;
    typeFilter: VersionType | 'ALL';
    onTypeFilterChange: (filter: VersionType | 'ALL') => void;
    onSelectVersion: (version: number) => void;
    onLoadMore: () => void;
}

function formatRelativeTime(dateStr: string): { label: string; full: string } {
    const date = new Date(dateStr);
    const full = format(date, 'yyyy年M月d日 HH:mm', { locale: zhCN });

    if (isToday(date)) return { label: `今天 ${format(date, 'HH:mm')}`, full };
    if (isYesterday(date)) return { label: `昨天 ${format(date, 'HH:mm')}`, full };

    const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 30) {
        return { label: formatDistanceToNow(date, { locale: zhCN, addSuffix: true }), full };
    }
    return { label: format(date, 'M月d日 HH:mm', { locale: zhCN }), full };
}

const VERSION_TYPE_CONFIG = {
    [VersionType.AUTO]: {
        icon: Zap,
        label: '自动保存',
        iconClass: 'text-muted-foreground',
        textClass: 'font-medium text-muted-foreground',
        rowClass: 'opacity-80 hover:opacity-100',
    },
    [VersionType.MANUAL]: {
        icon: Save,
        label: '手动保存',
        iconClass: 'text-primary',
        textClass: 'font-semibold text-foreground',
        rowClass: '',
    },
    [VersionType.RESTORE]: {
        icon: RefreshCw,
        label: '版本恢复',
        iconClass: 'text-blue-500',
        textClass: 'font-medium text-blue-600 dark:text-blue-400',
        rowClass: '',
    },
} as const;

const TYPE_FILTER_OPTIONS: Array<{ value: VersionType | 'ALL'; label: string }> = [
    { value: 'ALL', label: '全部' },
    { value: VersionType.MANUAL, label: '手动保存' },
    { value: VersionType.RESTORE, label: '恢复记录' },
    { value: VersionType.AUTO, label: '自动保存' },
];

export function VersionTimeline({
    versions,
    selectedVersion,
    total,
    totalLoaded,
    hasMore,
    isLoadingMore,
    typeFilter,
    onTypeFilterChange,
    onSelectVersion,
    onLoadMore,
}: VersionTimelineProps) {
    return (
        <aside className="w-[320px] border-l border-border bg-card flex-shrink-0 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    <History className="h-4 w-4" />
                    版本时间轴
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                    已加载 {totalLoaded} / {total} 个版本，点击版本即可预览
                </p>

                {/* 类型筛选标签 */}
                <div className="flex flex-wrap gap-1 mt-2">
                    {TYPE_FILTER_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onTypeFilterChange(opt.value)}
                            className={cn(
                                'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                                typeFilter === opt.value
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {versions.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                    {typeFilter === 'ALL' ? '暂无历史版本' : '该类型暂无版本记录'}
                </div>
            ) : (
                <div className="flex-1 overflow-auto p-3 space-y-1.5">
                    {versions.map((item) => {
                        const selected = selectedVersion === item.version;
                        const nickname = item.author.nickname || item.author.username;
                        const typeConfig =
                            VERSION_TYPE_CONFIG[item.type as VersionType] ??
                            VERSION_TYPE_CONFIG[VersionType.AUTO];
                        const TypeIcon = typeConfig.icon;
                        const { label: timeLabel, full: timeFull } = formatRelativeTime(
                            item.createdAt
                        );

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onSelectVersion(item.version)}
                                className={cn(
                                    'w-full text-left rounded-md border px-3 py-2.5 transition-colors',
                                    selected
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:bg-accent/40',
                                    typeConfig.rowClass
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <TypeIcon
                                            className={cn(
                                                'h-3.5 w-3.5 flex-shrink-0',
                                                typeConfig.iconClass
                                            )}
                                        />
                                        <span
                                            className={cn('text-sm truncate', typeConfig.textClass)}
                                        >
                                            {typeConfig.label}
                                        </span>
                                    </div>
                                    {selected && (
                                        <Badge className="text-[10px] h-5 flex-shrink-0">
                                            已选中
                                        </Badge>
                                    )}
                                </div>

                                {/* 备注：仅手动/恢复版本 */}
                                {item.changeLog && item.type !== VersionType.AUTO && (
                                    <p className="text-xs text-foreground/70 mt-1 line-clamp-2 pl-5">
                                        {item.changeLog}
                                    </p>
                                )}

                                <div className="mt-1.5 pl-5 flex items-center justify-between gap-2">
                                    <span className="text-xs text-muted-foreground truncate">
                                        {nickname}
                                    </span>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap cursor-default">
                                                    {timeLabel}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>{timeFull}</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </button>
                        );
                    })}

                    {hasMore && (
                        <Button
                            variant="outline"
                            className="w-full mt-2"
                            disabled={isLoadingMore}
                            onClick={onLoadMore}
                        >
                            {isLoadingMore && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            加载更多
                        </Button>
                    )}
                </div>
            )}
        </aside>
    );
}
