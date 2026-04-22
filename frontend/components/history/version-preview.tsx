'use client';

import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { versionsApi } from '@/lib/api/versions';
import { base64ToHtml } from '@/lib/editor/yjs-to-html';
import { ViewerContent } from '@/components/viewer/viewer-content';

interface VersionPreviewProps {
    detail: Awaited<ReturnType<typeof versionsApi.get>>['data'] | null;
    isLoading: boolean;
    activeVersion: number | null;
}

export function VersionPreview({ detail, isLoading, activeVersion }: VersionPreviewProps) {
    const contentHtml = useMemo(() => {
        if (!detail?.contentBase64) return '';
        try {
            return base64ToHtml(detail.contentBase64);
        } catch {
            return '<p class="text-destructive">版本内容解析失败</p>';
        }
    }, [detail]);

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
                未获取到版本 v{activeVersion} 的内容
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <div className="px-6 py-3 border-b border-border bg-background">
                <p className="text-sm font-medium">版本 v{detail.version} 预览</p>
                <p className="text-xs text-muted-foreground mt-1">{detail.changeLog || '无备注'}</p>
            </div>
            <ViewerContent contentHtml={contentHtml} />
        </div>
    );
}
