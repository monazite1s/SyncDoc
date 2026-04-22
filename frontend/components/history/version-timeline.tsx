'use client';

import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Clock3, History, Loader2, User } from 'lucide-react';
import { versionsApi } from '@/lib/api/versions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VersionTimelineProps {
    versions: Awaited<ReturnType<typeof versionsApi.list>>['data']['items'];
    selectedVersions: Set<number>;
    total: number;
    hasMore: boolean;
    isLoadingMore: boolean;
    onToggleVersion: (version: number) => void;
    onLoadMore: () => void;
}

function isManualSnapshot(changeLog?: string | null): boolean {
    if (!changeLog) return false;
    if (/^版本\s+\d+$/.test(changeLog)) return false;
    if (changeLog.startsWith('恢复到版本')) return false;
    return true;
}

export function VersionTimeline({
    versions,
    selectedVersions,
    total,
    hasMore,
    isLoadingMore,
    onToggleVersion,
    onLoadMore,
}: VersionTimelineProps) {
    return (
        <aside className="w-[320px] border-r border-border bg-card flex-shrink-0 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    <History className="h-4 w-4" />
                    版本时间轴
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                    已加载 {versions.length} / {total} 个版本，可最多选择两个版本对比
                </p>
            </div>

            {versions.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                    暂无历史版本
                </div>
            ) : (
                <div className="flex-1 overflow-auto p-3 space-y-2">
                    {versions.map((item) => {
                        const selected = selectedVersions.has(item.version);
                        const nickname = item.author.nickname || item.author.username;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onToggleVersion(item.version)}
                                className={cn(
                                    'w-full text-left rounded-md border px-3 py-2.5 transition-colors',
                                    selected
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:bg-accent/40'
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-sm">v{item.version}</p>
                                    <div className="flex items-center gap-1">
                                        {isManualSnapshot(item.changeLog) && (
                                            <Badge variant="outline" className="text-[10px] h-5">
                                                手动快照
                                            </Badge>
                                        )}
                                        {selected && (
                                            <Badge className="text-[10px] h-5">已选中</Badge>
                                        )}
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {item.changeLog || '无备注'}
                                </p>

                                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                    <p className="flex items-center gap-1.5">
                                        <User className="h-3 w-3" />
                                        {nickname}
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                        <Clock3 className="h-3 w-3" />
                                        {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm', {
                                            locale: zhCN,
                                        })}
                                    </p>
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
