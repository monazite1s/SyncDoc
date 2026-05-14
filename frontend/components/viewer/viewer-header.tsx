'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Pencil,
    History,
    MoreVertical,
    Archive,
    Trash2,
    Globe,
    Lock,
    UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DocumentViewContent } from '@collab/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { documentsApi } from '@/lib/api/documents';
import { DOCUMENT_ROLE_LABELS } from '@/lib/document-roles';
import { ShareDialog } from '@/components/documents/share-dialog';
import { useAuthStore } from '@/stores/auth.store';
import { ViewerMetaBar } from './viewer-meta-bar';

interface ViewerHeaderProps {
    document: DocumentViewContent;
    canEdit: boolean;
    /** 分享/协作者变更后刷新文档元数据与展示用内容 */
    onDocumentMetaRefresh?: () => Promise<void>;
}

export function ViewerHeader({ document, canEdit, onDocumentMetaRefresh }: ViewerHeaderProps) {
    const router = useRouter();
    const currentUser = useAuthStore((s) => s.user);
    const isOwner = document.userRole === 'OWNER';
    const canShareDoc = document.userRole === 'OWNER' || document.userRole === 'ADMIN';
    const [shareOpen, setShareOpen] = useState(false);

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

    return (
        <header className="border-b border-border bg-card flex-shrink-0">
            {/* 第一行：导航 + 操作按钮 */}
            <div className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
                                    onClick={() => router.push('/documents')}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>返回文档列表</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <h1 className="text-xl font-semibold text-foreground truncate">
                        {document.title}
                    </h1>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    {document.isPublic ? (
                                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    ) : (
                                        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                {document.isPublic ? '公开文档' : '私有文档'}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    {document.userRole ? (
                        <Badge
                            variant="secondary"
                            className="hidden sm:inline-flex h-7 px-2 text-xs font-normal shrink-0 max-w-[8rem]"
                            title="您在此文档中的权限"
                        >
                            {DOCUMENT_ROLE_LABELS[document.userRole]}
                        </Badge>
                    ) : null}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* 查看历史版本 */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => router.push(`/documents/${document.id}/history`)}
                    >
                        <History className="h-4 w-4" />
                        历史版本
                    </Button>

                    {canShareDoc && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setShareOpen(true)}
                        >
                            <UserPlus className="h-4 w-4" />
                            分享
                        </Button>
                    )}

                    {/* 编辑按钮 */}
                    {canEdit && (
                        <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => router.push(`/documents/${document.id}/edit`)}
                        >
                            <Pencil className="h-4 w-4" />
                            编辑
                        </Button>
                    )}

                    {/* 更多操作 */}
                    {isOwner && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
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

            {/* 第二行：元数据 */}
            <ViewerMetaBar document={document} />

            <ShareDialog
                documentId={document.id}
                isPublic={document.isPublic}
                collaborators={document.collaborators}
                currentUserId={currentUser?.id ?? ''}
                currentUserRole={document.userRole}
                open={shareOpen}
                onOpenChange={setShareOpen}
                onUpdate={() => void (onDocumentMetaRefresh?.() ?? Promise.resolve())}
            />
        </header>
    );
}
