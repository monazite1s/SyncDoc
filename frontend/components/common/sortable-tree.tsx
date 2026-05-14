'use client';

import { useCallback, useRef } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, GripVertical, Plus, Loader2 } from 'lucide-react';
import type { DocumentTreeNode } from '@/hooks/use-documents';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ---------- 扁平化工具 ----------

interface FlatItem {
    id: string;
    parentId: string | null;
    depth: number;
    node: DocumentTreeNode;
}

function flattenVisibleTree(
    nodes: DocumentTreeNode[],
    expandedNodes: Record<string, boolean>,
    depth = 0
): FlatItem[] {
    const result: FlatItem[] = [];
    for (const node of nodes) {
        result.push({ id: node.id, parentId: node.parentId ?? null, depth, node });
        const isOpen = expandedNodes[node.id] ?? false;
        if (isOpen && node.children.length > 0) {
            result.push(...flattenVisibleTree(node.children, expandedNodes, depth + 1));
        }
    }
    return result;
}

// ---------- 可排序的树节点 ----------

interface SortableItemProps {
    item: FlatItem;
    isActive: boolean;
    isExpanded: boolean;
    isCreating: boolean;
    onNavigate: (id: string) => void;
    onToggleExpand: (id: string) => void;
    onCreateChild: (id: string) => void;
}

function SortableTreeItem({
    item,
    isActive,
    isExpanded,
    isCreating,
    onNavigate,
    onToggleExpand,
    onCreateChild,
}: SortableItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const hasChildren = item.node.children.length > 0;

    return (
        <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-40')}>
            <div className="group relative flex items-center">
                {/* 拖拽手柄 */}
                <button
                    type="button"
                    className={cn(
                        'absolute left-0 top-1/2 -translate-y-1/2 cursor-grab',
                        'h-4 w-4 flex items-center justify-center rounded',
                        'opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity',
                        'text-muted-foreground hover:text-foreground'
                    )}
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-3 w-3" />
                </button>

                <Button
                    variant="ghost"
                    className={cn(
                        'w-full h-8 text-left text-xs pr-8',
                        isActive && 'bg-secondary text-foreground'
                    )}
                    style={{ paddingLeft: `${item.depth * 14 + 20}px` }}
                    onClick={() => onNavigate(item.id)}
                >
                    <span className="inline-flex items-center min-w-0 w-full gap-1.5">
                        {hasChildren ? (
                            <span
                                role="button"
                                aria-label={isExpanded ? '收起子文档' : '展开子文档'}
                                className="inline-flex h-4 w-4 items-center justify-center rounded hover:bg-muted"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleExpand(item.id);
                                }}
                            >
                                {isExpanded ? (
                                    <span className="inline-block h-0 w-0 border-t-[4px] border-l-[3px] border-r-[3px] border-t-foreground border-l-transparent border-r-transparent" />
                                ) : (
                                    <span className="inline-block h-0 w-0 border-l-[4px] border-t-[3px] border-b-[3px] border-l-foreground border-t-transparent border-b-transparent" />
                                )}
                            </span>
                        ) : (
                            <span className="inline-flex h-4 w-4" />
                        )}
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{item.node.title}</span>
                    </span>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity',
                        'group-hover:opacity-100',
                        isCreating && 'opacity-100'
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        onCreateChild(item.id);
                    }}
                    title="新增子文档"
                    disabled={isCreating}
                >
                    {isCreating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Plus className="h-3.5 w-3.5" />
                    )}
                </Button>
            </div>
        </div>
    );
}

// ---------- 主组件 ----------

interface SortableTreeProps {
    treeNodes: DocumentTreeNode[];
    activeDocumentId: string | undefined;
    expandedNodes: Record<string, boolean>;
    creatingParentId: string | null;
    onNavigate: (id: string) => void;
    onToggleExpand: (id: string) => void;
    onCreateChild: (id: string) => void;
    onMove: (id: string, data: { parentId?: string | null; position?: number }) => Promise<void>;
}

export function SortableTree({
    treeNodes,
    activeDocumentId,
    expandedNodes,
    creatingParentId,
    onNavigate,
    onToggleExpand,
    onCreateChild,
    onMove,
}: SortableTreeProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const flatItems = flattenVisibleTree(treeNodes, expandedNodes);
    const flatIds = flatItems.map((item) => item.id);

    const flatItemsRef = useRef(flatItems);
    flatItemsRef.current = flatItems;

    const handleDragStart = useCallback((_event: DragStartEvent) => {
        // 可用于 DragOverlay 等扩展
    }, []);

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;

            const items = flatItemsRef.current;
            const overItem = items.find((item) => item.id === over.id);
            if (!overItem) return;

            const siblings = items.filter((item) => item.parentId === overItem.parentId);
            const overSiblingIndex = siblings.findIndex((s) => s.id === over.id);

            await onMove(active.id as string, {
                parentId: overItem.parentId,
                position: overSiblingIndex,
            });
        },
        [onMove]
    );

    const handleDragCancel = useCallback(() => {
        // 预留给 DragOverlay 扩展
    }, []);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={(e) => void handleDragEnd(e)}
            onDragCancel={handleDragCancel}
        >
            <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                    {flatItems.map((item) => (
                        <SortableTreeItem
                            key={item.id}
                            item={item}
                            isActive={activeDocumentId === item.id}
                            isExpanded={expandedNodes[item.id] ?? false}
                            isCreating={creatingParentId === item.id}
                            onNavigate={onNavigate}
                            onToggleExpand={onToggleExpand}
                            onCreateChild={onCreateChild}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
