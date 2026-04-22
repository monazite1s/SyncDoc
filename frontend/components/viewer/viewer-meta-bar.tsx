'use client';

import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Users } from 'lucide-react';
import type { DocumentViewContent } from '@collab/types';
import { Badge } from '@/components/ui/badge';

interface ViewerMetaBarProps {
    document: DocumentViewContent;
}

export function ViewerMetaBar({ document }: ViewerMetaBarProps) {
    const relativeTime = formatDistanceToNow(new Date(document.updatedAt), {
        addSuffix: true,
        locale: zhCN,
    });

    return (
        <div className="flex items-center gap-4 px-6 py-2 text-sm text-muted-foreground border-t border-border/50">
            {/* 作者 */}
            <div className="flex items-center gap-1.5">
                <span>{document.author.nickname || document.author.username}</span>
            </div>

            <span className="text-border">·</span>

            {/* 最后编辑时间 */}
            <div className="flex items-center gap-1.5">
                <span>最后编辑于 {relativeTime}</span>
            </div>

            {/* 版本号 */}
            {document.latestVersion !== undefined && (
                <>
                    <span className="text-border">·</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs font-normal">
                        v{document.latestVersion}
                    </Badge>
                </>
            )}

            {/* 协作者数量 */}
            {document.collaboratorCount > 0 && (
                <>
                    <span className="text-border">·</span>
                    <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>{document.collaboratorCount} 位协作者</span>
                    </div>
                </>
            )}
        </div>
    );
}
