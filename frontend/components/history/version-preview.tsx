'use client';

import { useMemo } from 'react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Loader2, RefreshCw, Save, Zap } from 'lucide-react';
import { VersionType, type VersionDiffChange } from '@collab/types';
import { versionsApi } from '@/lib/api/versions';
import { base64ToHtml } from '@/lib/editor/yjs-to-html';
import { generateInlineDiff, structuredDiffToInlineHtml } from '@/lib/editor/html-diff';
import { ViewerContent } from '@/components/viewer/viewer-content';

interface VersionPreviewProps {
    detail: Awaited<ReturnType<typeof versionsApi.get>>['data'] | null;
    isLoading: boolean;
    activeVersion: number | null;
    showDiff: boolean;
    /** 结构化 diff 数据（由 history-page 请求后传入） */
    structuredChanges?: VersionDiffChange[];
    diffStats?: { additions: number; deletions: number; unchanged: number };
    diffTruncated?: boolean;
}

function formatVersionTime(dateStr: string): string {
    const date = new Date(dateStr);
    if (isToday(date)) return `今天 ${format(date, 'HH:mm')}`;
    if (isYesterday(date)) return `昨天 ${format(date, 'HH:mm')}`;
    const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 30) return formatDistanceToNow(date, { locale: zhCN, addSuffix: true });
    return format(date, 'yyyy年M月d日 HH:mm', { locale: zhCN });
}

const TYPE_CONFIG = {
    [VersionType.AUTO]: { icon: Zap, label: '自动保存', className: 'text-muted-foreground' },
    [VersionType.MANUAL]: { icon: Save, label: '手动保存', className: 'text-primary' },
    [VersionType.RESTORE]: { icon: RefreshCw, label: '版本恢复', className: 'text-blue-500' },
} as const;

export function VersionPreview({
    detail,
    isLoading,
    activeVersion,
    showDiff,
    structuredChanges,
    diffStats,
    diffTruncated,
}: VersionPreviewProps) {
    const contentHtml = useMemo(() => {
        if (!detail?.contentBase64) return '';

        try {
            if (!showDiff) {
                return base64ToHtml(detail.contentBase64);
            }

            // 优先使用结构化 diff
            if (structuredChanges && structuredChanges.length > 0) {
                return `<div class="version-diff-content">${structuredDiffToInlineHtml(structuredChanges)}</div>`;
            }

            // 降级到 Base64 inline diff
            const inlineDiffHtml = generateInlineDiff(
                detail.contentBase64,
                detail.prevContentBase64 ?? null
            );
            return `<div class="version-diff-content">${inlineDiffHtml}</div>`;
        } catch {
            return '<p class="text-destructive">版本内容解析失败</p>';
        }
    }, [detail, showDiff, structuredChanges]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>正在加载版本内容...</span>
            </div>
        );
    }

    if (!activeVersion) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                请选择一个版本进行预览
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                未获取到该版本的内容
            </div>
        );
    }

    const typeConfig = TYPE_CONFIG[detail.type as VersionType] ?? TYPE_CONFIG[VersionType.AUTO];
    const TypeIcon = typeConfig.icon;

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="shrink-0 px-6 py-3 border-b border-border bg-card">
                <div className="flex items-center gap-2">
                    <TypeIcon className={`h-4 w-4 ${typeConfig.className}`} />
                    <p className="text-sm font-medium text-foreground">{typeConfig.label}</p>
                    <span className="text-xs text-muted-foreground">·</span>
                    <p className="text-xs text-muted-foreground">
                        {formatVersionTime(detail.createdAt)}
                    </p>
                    {showDiff && diffStats && (
                        <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-green-600 dark:text-green-400">
                                +{diffStats.additions}
                            </span>
                            <span className="text-xs text-red-600 dark:text-red-400">
                                -{diffStats.deletions}
                            </span>
                        </>
                    )}
                    {showDiff && (
                        <>
                            <div className="flex-1" />
                        </>
                    )}
                </div>
                {detail.changeLog && (
                    <p className="text-xs text-foreground/70 mt-1 pl-6">{detail.changeLog}</p>
                )}
                {diffTruncated && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 pl-6">
                        内容过长，部分差异已截断
                    </p>
                )}
            </div>
            <div className="flex-1 min-h-0 overflow-auto bg-muted/30">
                <div className="max-w-[800px] mx-auto bg-card min-h-full shadow-sm border-x border-border/50">
                    <ViewerContent contentHtml={contentHtml} />
                </div>
            </div>
        </div>
    );
}
