'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Clock3, Hash, User2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DocumentDetail } from '@collab/types';
import { documentsApi } from '@/lib/api/documents';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditorDocumentChromeProps {
    document: DocumentDetail;
    isReadonly: boolean;
}

const TITLE_DEBOUNCE_MS = 500;

/**
 * 文档标题与元信息：放在编辑区顶部，标题以 H1 字号展示并与 API 中的 title 同步（非 ProseMirror 内标题，避免与正文 H1 冲突）。
 */
export function EditorDocumentChrome({ document, isReadonly }: EditorDocumentChromeProps) {
    const router = useRouter();
    const [title, setTitle] = useState(document.title);
    const [isSavingTitle, setIsSavingTitle] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const displayName = document.author.nickname || document.author.username;
    const relativeTime = formatDistanceToNow(new Date(document.updatedAt), {
        addSuffix: true,
        locale: zhCN,
    });
    const versionHash = document.latestVersionHash ?? document.id;
    const shortHash = versionHash.slice(0, 10);

    useEffect(() => {
        setTitle(document.title);
    }, [document.id, document.title]);

    function handleTitleChange(value: string) {
        setTitle(value);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            void (async () => {
                if (value.trim() === document.title) return;
                try {
                    setIsSavingTitle(true);
                    await documentsApi.update(document.id, { title: value.trim() || '无标题文档' });
                } catch {
                    toast.error('标题保存失败');
                    setTitle(document.title);
                } finally {
                    setIsSavingTitle(false);
                }
            })();
        }, TITLE_DEBOUNCE_MS);
    }

    return (
        <div className="w-full space-y-3 pb-2">
            {isReadonly ? (
                <h1 className="text-4xl font-semibold tracking-tight leading-tight text-foreground break-words">
                    {title}
                </h1>
            ) : (
                <Input
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className={cn(
                        'h-auto w-full min-h-[2.75rem] px-0 py-1',
                        // Input 默认含 md:text-sm，需在各断点显式覆盖为 H1 字号
                        'text-4xl md:text-4xl font-semibold tracking-tight leading-tight',
                        'bg-transparent border-none shadow-none',
                        'text-foreground placeholder:text-muted-foreground',
                        'focus-visible:ring-0 focus-visible:ring-offset-0',
                        isSavingTitle && 'opacity-60'
                    )}
                    placeholder="未命名文档"
                    maxLength={200}
                    aria-label="文档标题"
                />
            )}

            <div className="flex flex-wrap items-center gap-y-2 text-sm text-muted-foreground">
                <div className="inline-flex items-center gap-2 pr-4">
                    {document.author.avatar ? (
                        <img
                            src={document.author.avatar}
                            alt={displayName}
                            className="h-6 w-6 rounded-full object-cover"
                        />
                    ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <User2 className="h-3.5 w-3.5" />
                        </div>
                    )}
                    <span className="font-medium text-foreground">{displayName}</span>
                </div>

                <span className="h-4 w-px bg-border mr-4" />

                <div className="inline-flex items-center gap-1.5 pr-4">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>最近修改 {relativeTime}</span>
                </div>

                <span className="h-4 w-px bg-border mr-4" />

                <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    onClick={() => router.push(`/documents/${document.id}/history`)}
                    title="查看历史版本"
                >
                    <Hash className="h-3.5 w-3.5" />
                    <span>{shortHash}</span>
                </button>
            </div>
        </div>
    );
}
