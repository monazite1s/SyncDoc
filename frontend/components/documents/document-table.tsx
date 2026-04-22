'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Archive, Eye, FileText, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { DocumentListItem } from '@collab/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ResizableTableHeader } from './resizable-table-header';

interface DocumentTableProps {
    documents: DocumentListItem[];
    onArchive: (id: string) => void;
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
}

function canEdit(document: DocumentListItem): boolean {
    return document.userRole === 'OWNER' || document.userRole === 'EDITOR';
}

function canDelete(document: DocumentListItem): boolean {
    return document.userRole === 'OWNER';
}

export function DocumentTable({ documents, onArchive, onRestore, onDelete }: DocumentTableProps) {
    const router = useRouter();
    const [colWidths, setColWidths] = useState<number[]>([320, 160, 160, 170, 170]);
    const actionsColWidth = 72;

    const columns = useMemo(
        () => [
            { key: 'title', label: '标题', width: colWidths[0], minWidth: 260 },
            { key: 'location', label: '位置', width: colWidths[1], minWidth: 130 },
            { key: 'owner', label: '所有者', width: colWidths[2], minWidth: 130 },
            { key: 'createdAt', label: '创建时间', width: colWidths[3], minWidth: 150 },
            { key: 'updatedAt', label: '最近访问', width: colWidths[4], minWidth: 150 },
        ],
        [colWidths]
    );

    if (documents.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
                <p className="text-base font-medium">暂无匹配的文档</p>
                <p className="mt-1 text-sm text-muted-foreground">尝试切换筛选条件或新建文档</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border bg-card">
            <Table className="table-fixed min-w-[980px]">
                <colgroup>
                    {columns.map((column) => (
                        <col key={column.key} style={{ width: column.width }} />
                    ))}
                    <col style={{ width: actionsColWidth }} />
                </colgroup>
                <TableHeader className="bg-secondary/50 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent">
                        {columns.map((column, index) => (
                            <TableHead key={column.key} className="p-0">
                                <ResizableTableHeader
                                    label={column.label}
                                    width={column.width}
                                    minWidth={column.minWidth}
                                    onResize={(nextWidth) =>
                                        setColWidths((prev) =>
                                            prev.map((value, valueIndex) =>
                                                valueIndex === index ? nextWidth : value
                                            )
                                        )
                                    }
                                />
                            </TableHead>
                        ))}
                        <TableHead className="text-right pr-4">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map((document) => {
                        const authorName = document.author.nickname || document.author.username;
                        const archived = document.status === 'ARCHIVED';

                        return (
                            <TableRow
                                key={document.id}
                                className="cursor-pointer"
                                onClick={() => router.push(`/documents/${document.id}`)}
                            >
                                <TableCell className="px-3 py-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="truncate font-medium">
                                            {document.title}
                                        </span>
                                        {archived && (
                                            <Badge
                                                variant="secondary"
                                                className="h-5 text-[10px] shrink-0"
                                            >
                                                已归档
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="px-3 py-3 text-sm text-muted-foreground">
                                    {document.userRole === 'OWNER' ? '我的空间' : '与我共享'}
                                </TableCell>
                                <TableCell className="px-3 py-3 text-sm">{authorName}</TableCell>
                                <TableCell className="px-3 py-3 text-sm text-muted-foreground">
                                    {format(new Date(document.createdAt), 'yyyy-MM-dd HH:mm', {
                                        locale: zhCN,
                                    })}
                                </TableCell>
                                <TableCell className="px-3 py-3 text-sm text-muted-foreground">
                                    {format(new Date(document.updatedAt), 'yyyy-MM-dd HH:mm', {
                                        locale: zhCN,
                                    })}
                                </TableCell>
                                <TableCell
                                    className="px-3 py-3 text-right"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    router.push(`/documents/${document.id}`)
                                                }
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                查看
                                            </DropdownMenuItem>
                                            {canEdit(document) && !archived && (
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        router.push(
                                                            `/documents/${document.id}/edit`
                                                        )
                                                    }
                                                >
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    编辑
                                                </DropdownMenuItem>
                                            )}
                                            {canEdit(document) && !archived && (
                                                <DropdownMenuItem
                                                    onClick={() => onArchive(document.id)}
                                                >
                                                    <Archive className="h-4 w-4 mr-2" />
                                                    归档
                                                </DropdownMenuItem>
                                            )}
                                            {canEdit(document) && archived && (
                                                <DropdownMenuItem
                                                    onClick={() => onRestore(document.id)}
                                                >
                                                    <RotateCcw className="h-4 w-4 mr-2" />
                                                    恢复
                                                </DropdownMenuItem>
                                            )}
                                            {canDelete(document) && (
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
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
