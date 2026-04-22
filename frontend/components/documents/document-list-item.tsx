'use client';

import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { FileText, MoreHorizontal, Pencil, Archive, RotateCcw, Trash2, Eye } from 'lucide-react';
import type { CollaboratorRole, DocumentListItem } from '@collab/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DocumentListItemProps {
    document: DocumentListItem;
    onArchive: (id: string) => void;
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
}

function canEdit(userRole: CollaboratorRole | null): boolean {
    return userRole === 'OWNER' || userRole === 'EDITOR';
}

function canDelete(userRole: CollaboratorRole | null): boolean {
    return userRole === 'OWNER';
}

export function DocumentListItemRow({
    document,
    onArchive,
    onRestore,
    onDelete,
}: DocumentListItemProps) {
    const router = useRouter();
    const editable = canEdit(document.userRole);
    const deletable = canDelete(document.userRole);
    const authorName = document.author.nickname || document.author.username;
    const isArchived = document.status === 'ARCHIVED';

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/documents/${document.id}`)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    router.push(`/documents/${document.id}`);
                }
            }}
            className={cn(
                'group border-b border-border px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer',
                'hover:bg-accent/40',
                isArchived && 'opacity-70'
            )}
        >
            <div className="mt-0.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{document.title}</p>
                    {isArchived && (
                        <Badge variant="secondary" className="h-5 text-[10px]">
                            已归档
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                    {authorName} ·{' '}
                    {formatDistanceToNow(new Date(document.updatedAt), {
                        addSuffix: true,
                        locale: zhCN,
                    })}{' '}
                    ·{' '}
                    {document.collaboratorCount > 1
                        ? `${document.collaboratorCount} 人协作`
                        : '仅自己'}
                </p>
            </div>

            <div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
            >
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/documents/${document.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看
                        </DropdownMenuItem>
                        {editable && !isArchived && (
                            <DropdownMenuItem
                                onClick={() => router.push(`/documents/${document.id}/edit`)}
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                编辑
                            </DropdownMenuItem>
                        )}
                        {editable && !isArchived && (
                            <DropdownMenuItem onClick={() => onArchive(document.id)}>
                                <Archive className="h-4 w-4 mr-2" />
                                归档
                            </DropdownMenuItem>
                        )}
                        {editable && isArchived && (
                            <DropdownMenuItem onClick={() => onRestore(document.id)}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                恢复
                            </DropdownMenuItem>
                        )}
                        {deletable && (
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete(document.id)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
