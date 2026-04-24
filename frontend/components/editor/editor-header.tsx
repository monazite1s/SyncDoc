'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Archive,
    Eye,
    History,
    Loader2,
    MoreVertical,
    Save,
    Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DocumentDetail } from '@collab/types';
import { documentsApi } from '@/lib/api/documents';
import { versionsApi } from '@/lib/api/versions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { useEditorContext } from './editor-provider';
import { getCursorColor } from '@/lib/editor/cursor-colors';

interface EditorHeaderProps {
    document: DocumentDetail;
    isReadonly: boolean;
}

/**
 * 编辑页顶部操作区：完成编辑、保存版本、历史版本、在线协作头像、更多操作。
 */
export function EditorHeader({ document, isReadonly }: EditorHeaderProps) {
    const router = useRouter();
    const { provider, isSynced, connectionStatus } = useEditorContext();
    const [onlineUsers, setOnlineUsers] = useState<
        Array<{ id: string; name: string; color: string }>
    >([]);
    const [saveVersionOpen, setSaveVersionOpen] = useState(false);
    const [changeLog, setChangeLog] = useState('');
    const [isSavingVersion, setIsSavingVersion] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isOwner = document.userRole === 'OWNER';
    const canWrite = document.userRole === 'OWNER' || document.userRole === 'EDITOR';

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

    // 快捷键 Cmd/Ctrl+Shift+S 触发保存版本
    useEffect(() => {
        if (!canWrite || isReadonly) return;

        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                setSaveVersionOpen(true);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canWrite, isReadonly]);

    // 打开弹窗时自动聚焦
    useEffect(() => {
        if (saveVersionOpen) {
            setTimeout(() => textareaRef.current?.focus(), 100);
        } else {
            setChangeLog('');
        }
    }, [saveVersionOpen]);

    async function handleSaveVersion() {
        setIsSavingVersion(true);
        try {
            await versionsApi.create(document.id, { changeLog: changeLog.trim() || undefined });
            toast.success('版本已保存');
            setSaveVersionOpen(false);
        } catch {
            toast.error('保存版本失败，请重试');
        } finally {
            setIsSavingVersion(false);
        }
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
        <>
            <header className="shrink-0 border-b border-border bg-card/95">
                <div className="w-full px-4 sm:px-6 py-3 flex items-center gap-2 flex-wrap">
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

                    {canWrite && !isReadonly && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1.5"
                                        onClick={() => setSaveVersionOpen(true)}
                                    >
                                        <Save className="h-4 w-4" />
                                        保存版本
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>保存当前为版本节点 (⌘⇧S)</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => router.push(`/documents/${document.id}/history`)}
                    >
                        <History className="h-4 w-4" />
                        历史版本
                    </Button>

                    {isReadonly && (
                        <Badge variant="secondary" className="h-8 gap-1 px-2">
                            <Eye className="h-3 w-3" />
                            只读
                        </Badge>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                        {onlineUsers.length > 0 && (
                            <div className="flex items-center gap-1">
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
                    </div>
                </div>
            </header>

            {/* 保存版本弹窗 */}
            <Dialog open={saveVersionOpen} onOpenChange={setSaveVersionOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>保存版本</DialogTitle>
                        <DialogDescription>
                            将当前文档内容保存为一个版本节点，方便后续回溯。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Textarea
                            ref={textareaRef}
                            placeholder="描述本次修改内容（可选），例如：修改了第三章结论部分"
                            value={changeLog}
                            onChange={(e) => setChangeLog(e.target.value)}
                            maxLength={100}
                            rows={3}
                            className="resize-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    void handleSaveVersion();
                                }
                            }}
                        />
                        <p className="text-xs text-muted-foreground text-right mt-1">
                            {changeLog.length}/100
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setSaveVersionOpen(false)}
                            disabled={isSavingVersion}
                        >
                            取消
                        </Button>
                        <Button onClick={() => void handleSaveVersion()} disabled={isSavingVersion}>
                            {isSavingVersion && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            保存版本
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
