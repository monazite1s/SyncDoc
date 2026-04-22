'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Archive, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { DocumentDetail } from '@collab/types';
import { documentsApi } from '@/lib/api/documents';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEditorContext } from './editor-provider';
import { getCursorColor } from '@/lib/editor/cursor-colors';
import { cn } from '@/lib/utils';

interface EditorHeaderProps {
    document: DocumentDetail;
    isReadonly: boolean;
}

const TITLE_DEBOUNCE_MS = 500;

export function EditorHeader({ document, isReadonly }: EditorHeaderProps) {
    const router = useRouter();
    const { provider, isSynced, connectionStatus } = useEditorContext();
    const [title, setTitle] = useState(document.title);
    const [isSavingTitle, setIsSavingTitle] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<
        Array<{ id: string; name: string; color: string }>
    >([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isOwner = document.userRole === 'OWNER';

    // 监听在线用户变化
    useEffect(() => {
        if (!provider) return;

        const awareness = provider.awareness;
        if (!awareness) return;

        function updateOnlineUsers() {
            if (!awareness) return;
            const states = awareness.getStates();
            const users: Array<{ id: string; name: string; color: string }> = [];
            states.forEach((state, clientId) => {
                const u = state.user as { id?: string; name?: string } | undefined;
                if (u?.name) {
                    users.push({
                        id: u.id ?? String(clientId),
                        name: u.name,
                        color: u.id ? getCursorColor(u.id) : '#a29bfe',
                    });
                }
            });
            setOnlineUsers(users);
        }

        awareness.on('change', updateOnlineUsers);
        updateOnlineUsers();

        return () => {
            awareness.off('change', updateOnlineUsers);
        };
    }, [provider]);

    // 防抖更新标题
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

    async function handleArchive() {
        try {
            await documentsApi.archive(document.id);
            toast.success('文档已归档');
            router.push('/documents');
        } catch {
            toast.error('归档失败');
        }
    }

    async function handleDelete() {
        try {
            await documentsApi.delete(document.id);
            toast.success('文档已删除');
            router.push('/documents');
        } catch {
            toast.error('删除失败');
        }
    }

    const exitTooltip =
        connectionStatus === 'disconnected'
            ? '网络断开，建议稍后确认内容是否已保存'
            : isSynced
              ? '已同步，返回查看页'
              : '正在同步，返回查看页';

    return (
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 flex-shrink-0">
            {/* 返回按钮 */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => router.push(`/documents/${document.id}`)}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            完成编辑
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{exitTooltip}</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* 文档标题 */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
                {isReadonly ? (
                    <span className="text-base font-medium text-foreground truncate">{title}</span>
                ) : (
                    <Input
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className={cn(
                            'h-auto flex-1 min-w-0 px-0 py-0 text-base font-medium bg-transparent border-none shadow-none',
                            'text-foreground placeholder:text-muted-foreground',
                            'focus-visible:ring-0 focus-visible:ring-offset-0',
                            isSavingTitle && 'opacity-60'
                        )}
                        placeholder="无标题文档"
                        maxLength={200}
                    />
                )}
                {isReadonly && (
                    <Badge variant="secondary" className="flex-shrink-0 gap-1">
                        <Eye className="h-3 w-3" />
                        只读
                    </Badge>
                )}
            </div>

            {/* 在线用户头像列表 */}
            {onlineUsers.length > 0 && (
                <div className="flex items-center gap-1 flex-shrink-0">
                    {onlineUsers.slice(0, 5).map((u) => (
                        <TooltipProvider key={u.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 ring-2 ring-background"
                                        style={{ backgroundColor: u.color }}
                                    >
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>{u.name}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                    {onlineUsers.length > 5 && (
                        <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium bg-muted text-muted-foreground ring-2 ring-background">
                            +{onlineUsers.length - 5}
                        </div>
                    )}
                </div>
            )}

            {/* 操作菜单（仅 OWNER） */}
            {isOwner && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        {document.status !== 'ARCHIVED' && (
                            <DropdownMenuItem onClick={() => void handleArchive()}>
                                <Archive className="h-4 w-4 mr-2" />
                                归档文档
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => void handleDelete()}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除文档
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </header>
    );
}
