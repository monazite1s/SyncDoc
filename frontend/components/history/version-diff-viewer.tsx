'use client';

import { Loader2 } from 'lucide-react';
import { versionsApi } from '@/lib/api/versions';

interface VersionDiffViewerProps {
    diffResult: Awaited<ReturnType<typeof versionsApi.diff>>['data'] | null;
    isLoading: boolean;
    selectedVersions: number[];
}

export function VersionDiffViewer({
    diffResult,
    isLoading,
    selectedVersions,
}: VersionDiffViewerProps) {
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>正在生成版本对比...</span>
            </div>
        );
    }

    if (!diffResult) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-center p-6">
                请选择两个版本进行对比
                <br />
                当前已选择：{selectedVersions.join(', ') || '无'}
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 overflow-auto">
            <div className="px-6 py-3 border-b border-border bg-background">
                <p className="text-sm font-medium">
                    版本对比：v{diffResult.fromVersion} → v{diffResult.toVersion}
                </p>
                <p className="text-xs text-muted-foreground mt-1">红色为删除内容，绿色为新增内容</p>
            </div>

            <div className="p-6">
                <div
                    className="rounded-md border border-border bg-card p-4 text-sm leading-7 whitespace-pre-wrap history-diff-content"
                    dangerouslySetInnerHTML={{ __html: diffResult.diffHtml || '暂无差异' }}
                />
            </div>
        </div>
    );
}
