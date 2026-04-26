'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Globe, Loader2, Lock, Search, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CollaboratorRole } from '@collab/types';
import { authApi } from '@/lib/api/auth';
import { documentsApi } from '@/lib/api/documents';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface ShareDialogProps {
    documentId: string;
    isPublic: boolean;
    collaborators: Array<{
        userId: string;
        role: CollaboratorRole;
        user: {
            id: string;
            username: string;
            nickname?: string | null;
            avatar?: string | null;
        };
    }>;
    currentUserId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: () => void;
}

type SearchResult = Pick<import('@collab/types').User, 'id' | 'username' | 'nickname' | 'avatar'>;

const ROLE_LABELS: Record<CollaboratorRole, string> = {
    OWNER: '所有者',
    EDITOR: '编辑者',
    VIEWER: '查看者',
};

const ROLE_VARIANTS: Record<CollaboratorRole, 'default' | 'secondary' | 'outline'> = {
    OWNER: 'default',
    EDITOR: 'secondary',
    VIEWER: 'outline',
};

export function ShareDialog({
    documentId,
    isPublic,
    collaborators,
    currentUserId,
    open,
    onOpenChange,
    onUpdate,
}: ShareDialogProps) {
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [addingUserId, setAddingUserId] = useState<string | null>(null);
    const [publicEnabled, setPublicEnabled] = useState(isPublic);
    const [copied, setCopied] = useState(false);
    const [updatingRole, setUpdatingRole] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 同步外部 isPublic 变更
    useEffect(() => {
        setPublicEnabled(isPublic);
    }, [isPublic]);

    // 弹窗关闭时重置搜索状态
    useEffect(() => {
        if (!open) {
            setKeyword('');
            setResults([]);
        }
    }, [open]);

    // 防抖搜索 (300ms)
    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        if (!keyword.trim()) {
            setResults([]);
            return void setSearching(false);
        }

        setSearching(true);
        timerRef.current = setTimeout(async () => {
            try {
                const res = await authApi.searchUsers(keyword.trim());
                const users = res.data;
                // 过滤掉已是协作者的用户（包括文档所有者）
                const existingIds = new Set(collaborators.map((c) => c.userId));
                setResults(users.filter((u) => !existingIds.has(u.id)));
            } catch {
                toast.error('搜索用户失败');
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [keyword, collaborators]);

    const handleAdd = useCallback(
        async (userId: string, role: 'EDITOR' | 'VIEWER') => {
            setAddingUserId(userId);
            try {
                await documentsApi.addCollaborator(documentId, userId, role);
                toast.success('已添加协作者');
                onUpdate();
                setResults((prev) => prev.filter((u) => u.id !== userId));
            } catch {
                toast.error('添加协作者失败');
            } finally {
                setAddingUserId(null);
            }
        },
        [documentId, onUpdate]
    );

    const handleRemove = useCallback(
        async (userId: string) => {
            try {
                await documentsApi.removeCollaborator(documentId, userId);
                toast.success('已移除协作者');
                onUpdate();
            } catch {
                toast.error('移除协作者失败');
            }
        },
        [documentId, onUpdate]
    );

    const handleRoleChange = useCallback(
        async (userId: string, role: 'EDITOR' | 'VIEWER') => {
            setUpdatingRole(userId);
            try {
                await documentsApi.updateCollaboratorRole(documentId, userId, role);
                toast.success('角色已更新');
                onUpdate();
            } catch {
                toast.error('更新角色失败');
            } finally {
                setUpdatingRole(null);
            }
        },
        [documentId, onUpdate]
    );

    const handleTogglePublic = useCallback(
        async (checked: boolean) => {
            try {
                await documentsApi.update(documentId, { isPublic: checked });
                setPublicEnabled(checked);
                toast.success(checked ? '已开启公开访问' : '已关闭公开访问');
                onUpdate();
            } catch {
                toast.error('更新分享设置失败');
            }
        },
        [documentId, onUpdate]
    );

    const handleCopyLink = useCallback(() => {
        const url = `${window.location.origin}/documents/${documentId}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            toast.success('链接已复制');
            setTimeout(() => setCopied(false), 2000);
        });
    }, [documentId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>分享文档</DialogTitle>
                </DialogHeader>

                {/* 搜索用户 */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="搜索用户名..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="pl-9 pr-9"
                    />
                    {keyword && (
                        <button
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setKeyword('')}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* 搜索结果 */}
                {searching && (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}
                {!searching && results.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                        {results.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between px-3 py-2 hover:bg-accent"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <Avatar className="h-7 w-7">
                                        <AvatarImage src={user.avatar ?? undefined} />
                                        <AvatarFallback className="text-xs">
                                            {(user.nickname ?? user.username)
                                                .charAt(0)
                                                .toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate text-sm">
                                        {user.nickname ?? user.username}
                                    </span>
                                </div>
                                <Select
                                    onValueChange={(role) =>
                                        void handleAdd(user.id, role as 'EDITOR' | 'VIEWER')
                                    }
                                    disabled={addingUserId === user.id}
                                >
                                    <SelectTrigger className="h-7 w-24 ml-2">
                                        <UserPlus className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                                        <SelectValue placeholder="添加" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EDITOR">编辑者</SelectItem>
                                        <SelectItem value="VIEWER">查看者</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                )}
                {!searching && keyword.trim() && results.length === 0 && (
                    <p className="py-3 text-center text-sm text-muted-foreground">
                        未找到匹配的用户
                    </p>
                )}

                {/* 当前协作者 */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">协作者</h4>
                    <div className="max-h-52 overflow-y-auto space-y-1">
                        {collaborators.map((collab) => {
                            const isSelf = collab.userId === currentUserId;
                            const isOwner = collab.role === 'OWNER';
                            const displayName = collab.user.nickname ?? collab.user.username;

                            return (
                                <div
                                    key={collab.userId}
                                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Avatar className="h-7 w-7">
                                            <AvatarImage src={collab.user.avatar ?? undefined} />
                                            <AvatarFallback className="text-xs">
                                                {displayName.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate text-sm">
                                            {displayName}
                                            {isSelf && (
                                                <span className="text-muted-foreground"> (你)</span>
                                            )}
                                        </span>
                                        <Badge
                                            variant={ROLE_VARIANTS[collab.role]}
                                            className="text-[10px] h-5"
                                        >
                                            {ROLE_LABELS[collab.role]}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {!isOwner && !isSelf && (
                                            <>
                                                <Select
                                                    value={collab.role}
                                                    onValueChange={(role) =>
                                                        void handleRoleChange(
                                                            collab.userId,
                                                            role as 'EDITOR' | 'VIEWER'
                                                        )
                                                    }
                                                    disabled={updatingRole === collab.userId}
                                                >
                                                    <SelectTrigger className="h-7 w-20">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="EDITOR">
                                                            编辑者
                                                        </SelectItem>
                                                        <SelectItem value="VIEWER">
                                                            查看者
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    onClick={() => void handleRemove(collab.userId)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </>
                                        )}
                                        {updatingRole === collab.userId && (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 公开分享开关 */}
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-3">
                    <div className="flex items-center gap-2">
                        {publicEnabled ? (
                            <Globe className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                            <p className="text-sm font-medium">
                                {publicEnabled ? '公开访问' : '仅协作者可访问'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {publicEnabled
                                    ? '任何拥有链接的人都可以查看'
                                    : '只有协作者可以访问此文档'}
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={publicEnabled}
                        onCheckedChange={(v) => void handleTogglePublic(v)}
                    />
                </div>

                {/* 复制链接 */}
                {publicEnabled && (
                    <Button variant="outline" size="sm" className="w-full" onClick={handleCopyLink}>
                        {copied ? (
                            <Check className="h-4 w-4 mr-1.5" />
                        ) : (
                            <Copy className="h-4 w-4 mr-1.5" />
                        )}
                        {copied ? '已复制' : '复制公开链接'}
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    );
}
