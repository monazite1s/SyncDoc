'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Check,
    Copy,
    Globe,
    KeyRound,
    Link2,
    Loader2,
    Lock,
    Search,
    Trash2,
    UserPlus,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CollaboratorRole } from '@collab/types';
import { DOCUMENT_ROLE_LABELS } from '@/lib/document-roles';
import { authApi } from '@/lib/api/auth';
import { documentsApi } from '@/lib/api/documents';
import { shareApi, type ShareLinkItem } from '@/lib/api/share';
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
    currentUserRole: CollaboratorRole | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: () => void;
}

type SearchResult = Pick<import('@collab/types').User, 'id' | 'username' | 'nickname' | 'avatar'>;

const ROLE_VARIANTS: Record<CollaboratorRole, 'default' | 'secondary' | 'outline'> = {
    OWNER: 'default',
    ADMIN: 'secondary',
    EDITOR: 'secondary',
    VIEWER: 'outline',
};

export function ShareDialog({
    documentId,
    isPublic,
    collaborators,
    currentUserId,
    currentUserRole,
    open,
    onOpenChange,
    onUpdate,
}: ShareDialogProps) {
    const [activeTab, setActiveTab] = useState<'collaborators' | 'links'>('collaborators');
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [addingUserId, setAddingUserId] = useState<string | null>(null);
    const [publicEnabled, setPublicEnabled] = useState(isPublic);
    const [copied, setCopied] = useState(false);
    const [updatingRole, setUpdatingRole] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 分享链接相关状态
    const [shareLinks, setShareLinks] = useState<ShareLinkItem[]>([]);
    const [newLinkRole, setNewLinkRole] = useState<'VIEWER' | 'EDITOR'>('VIEWER');
    const [newLinkExpiry, setNewLinkExpiry] = useState('');
    const [newLinkPassword, setNewLinkPassword] = useState('');
    const [isCreatingLink, setIsCreatingLink] = useState(false);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

    // 当前用户是否可管理协作者和分享设置
    const isManager = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
    const isOwner = currentUserRole === 'OWNER';

    // 同步外部 isPublic 变更
    useEffect(() => {
        setPublicEnabled(isPublic);
    }, [isPublic]);

    // 弹窗关闭时重置搜索状态
    useEffect(() => {
        if (!open) {
            setKeyword('');
            setResults([]);
            setActiveTab('collaborators');
            setNewLinkRole('VIEWER');
            setNewLinkExpiry('');
            setNewLinkPassword('');
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
        async (userId: string, role: 'ADMIN' | 'EDITOR' | 'VIEWER') => {
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
        async (userId: string, role: 'ADMIN' | 'EDITOR' | 'VIEWER') => {
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

    // 加载分享链接列表
    const loadShareLinks = useCallback(async () => {
        setLoadingLinks(true);
        try {
            const res = await shareApi.list(documentId);
            setShareLinks(res.data);
        } catch {
            toast.error('加载分享链接失败');
        } finally {
            setLoadingLinks(false);
        }
    }, [documentId]);

    // 弹窗打开时，如果是管理员则加载分享链接
    useEffect(() => {
        if (open && isManager) {
            void loadShareLinks();
        }
    }, [open, isManager, loadShareLinks]);

    // 创建分享链接
    const handleCreateLink = useCallback(async () => {
        setIsCreatingLink(true);
        try {
            const data: { role: 'VIEWER' | 'EDITOR'; expiresAt?: string; password?: string } = {
                role: newLinkRole,
            };
            if (newLinkExpiry) {
                data.expiresAt = new Date(newLinkExpiry).toISOString();
            }
            if (newLinkPassword.trim()) {
                data.password = newLinkPassword.trim();
            }
            await shareApi.create(documentId, data);
            toast.success('分享链接已创建');
            setNewLinkExpiry('');
            setNewLinkPassword('');
            await loadShareLinks();
        } catch {
            toast.error('创建分享链接失败');
        } finally {
            setIsCreatingLink(false);
        }
    }, [documentId, newLinkRole, newLinkExpiry, newLinkPassword, loadShareLinks]);

    // 撤销分享链接
    const handleRevokeLink = useCallback(
        async (linkId: string) => {
            try {
                await shareApi.revoke(documentId, linkId);
                toast.success('链接已撤销');
                setShareLinks((prev) => prev.filter((l) => l.id !== linkId));
            } catch {
                toast.error('撤销链接失败');
            }
        },
        [documentId]
    );

    // 复制分享链接
    const handleCopyShareLink = useCallback((token: string, linkId: string) => {
        const url = `${window.location.origin}/share/${token}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedLinkId(linkId);
            toast.success('链接已复制');
            setTimeout(() => setCopiedLinkId(null), 2000);
        });
    }, []);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>分享文档</DialogTitle>
                </DialogHeader>

                {/* 标签页切换（仅管理员可见） */}
                {isManager && (
                    <div className="flex gap-2 border-b border-border pb-2">
                        <Button
                            variant={activeTab === 'collaborators' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActiveTab('collaborators')}
                        >
                            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                            协作者
                        </Button>
                        <Button
                            variant={activeTab === 'links' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActiveTab('links')}
                        >
                            <Link2 className="h-3.5 w-3.5 mr-1.5" />
                            分享链接
                        </Button>
                    </div>
                )}

                {/* ===== 协作者标签页 ===== */}
                {(!isManager || activeTab === 'collaborators') && (
                    <>
                        {/* 搜索用户（仅管理员可见） */}
                        {isManager && (
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
                        )}

                        {/* 搜索结果 */}
                        {isManager && searching && (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {isManager && !searching && results.length > 0 && (
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
                                                void handleAdd(
                                                    user.id,
                                                    role as 'ADMIN' | 'EDITOR' | 'VIEWER'
                                                )
                                            }
                                            disabled={addingUserId === user.id}
                                        >
                                            <SelectTrigger className="h-7 w-24 ml-2">
                                                <UserPlus className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                                                <SelectValue placeholder="添加" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ADMIN">管理员</SelectItem>
                                                <SelectItem value="EDITOR">编辑者</SelectItem>
                                                <SelectItem value="VIEWER">查看者</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        )}
                        {isManager && !searching && keyword.trim() && results.length === 0 && (
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
                                    const collabIsOwner = collab.role === 'OWNER';
                                    const displayName =
                                        collab.user.nickname ?? collab.user.username;

                                    return (
                                        <div
                                            key={collab.userId}
                                            className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Avatar className="h-7 w-7">
                                                    <AvatarImage
                                                        src={collab.user.avatar ?? undefined}
                                                    />
                                                    <AvatarFallback className="text-xs">
                                                        {displayName.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="truncate text-sm">
                                                    {displayName}
                                                    {isSelf && (
                                                        <span className="text-muted-foreground">
                                                            {' '}
                                                            (你)
                                                        </span>
                                                    )}
                                                </span>
                                                <Badge
                                                    variant={ROLE_VARIANTS[collab.role]}
                                                    className="text-[10px] h-5"
                                                >
                                                    {DOCUMENT_ROLE_LABELS[collab.role]}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {!collabIsOwner && !isSelf && isManager && (
                                                    <>
                                                        <Select
                                                            value={collab.role}
                                                            onValueChange={(role) =>
                                                                void handleRoleChange(
                                                                    collab.userId,
                                                                    role as
                                                                        | 'ADMIN'
                                                                        | 'EDITOR'
                                                                        | 'VIEWER'
                                                                )
                                                            }
                                                            disabled={
                                                                updatingRole === collab.userId
                                                            }
                                                        >
                                                            <SelectTrigger className="h-7 w-20">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {collabIsOwner && (
                                                                    <SelectItem value="ADMIN">
                                                                        管理员
                                                                    </SelectItem>
                                                                )}
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
                                                            onClick={() =>
                                                                void handleRemove(collab.userId)
                                                            }
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

                        {/* 公开分享开关（仅所有者可见） */}
                        {isOwner && (
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
                        )}

                        {/* 复制链接 */}
                        {publicEnabled && isOwner && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={handleCopyLink}
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 mr-1.5" />
                                ) : (
                                    <Copy className="h-4 w-4 mr-1.5" />
                                )}
                                {copied ? '已复制' : '复制公开链接'}
                            </Button>
                        )}
                    </>
                )}

                {/* ===== 分享链接标签页 ===== */}
                {isManager && activeTab === 'links' && (
                    <>
                        {/* 创建链接 */}
                        <div className="space-y-3 rounded-md border border-border p-3">
                            <h4 className="text-sm font-medium">创建分享链接</h4>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground shrink-0 w-14">
                                    角色
                                </span>
                                <Select
                                    value={newLinkRole}
                                    onValueChange={(v) => setNewLinkRole(v as 'VIEWER' | 'EDITOR')}
                                >
                                    <SelectTrigger className="h-8 flex-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VIEWER">查看者</SelectItem>
                                        <SelectItem value="EDITOR">编辑者</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground shrink-0 w-14">
                                    过期时间
                                </span>
                                <Input
                                    type="datetime-local"
                                    value={newLinkExpiry}
                                    onChange={(e) => setNewLinkExpiry(e.target.value)}
                                    className="h-8 flex-1 text-sm"
                                    placeholder="可选"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground shrink-0 w-14">
                                    密码
                                </span>
                                <Input
                                    type="password"
                                    value={newLinkPassword}
                                    onChange={(e) => setNewLinkPassword(e.target.value)}
                                    className="h-8 flex-1 text-sm"
                                    placeholder="可选，留则无密码"
                                />
                            </div>
                            <Button
                                size="sm"
                                className="w-full"
                                disabled={isCreatingLink}
                                onClick={() => void handleCreateLink()}
                            >
                                {isCreatingLink ? (
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                ) : (
                                    <Link2 className="h-4 w-4 mr-1.5" />
                                )}
                                创建链接
                            </Button>
                        </div>

                        {/* 已创建链接列表 */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">已创建的链接</h4>
                            {loadingLinks ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : shareLinks.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                    暂无分享链接
                                </p>
                            ) : (
                                <div className="max-h-52 overflow-y-auto space-y-1">
                                    {shareLinks.map((link) => (
                                        <div
                                            key={link.id}
                                            className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-accent"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                <code className="text-xs text-muted-foreground font-mono">
                                                    {link.token.slice(0, 8)}...
                                                </code>
                                                <Badge
                                                    variant={
                                                        link.role === 'EDITOR'
                                                            ? 'secondary'
                                                            : 'outline'
                                                    }
                                                    className="text-[10px] h-5"
                                                >
                                                    {link.role === 'EDITOR' ? '编辑者' : '查看者'}
                                                </Badge>
                                                {link.hasPassword && (
                                                    <KeyRound className="h-3 w-3 text-muted-foreground" />
                                                )}
                                                {link.expiresAt && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(
                                                            link.expiresAt
                                                        ).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground"
                                                    onClick={() =>
                                                        handleCopyShareLink(link.token, link.id)
                                                    }
                                                >
                                                    {copiedLinkId === link.id ? (
                                                        <Check className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    onClick={() => void handleRevokeLink(link.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
