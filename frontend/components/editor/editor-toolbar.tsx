'use client';

import {
    Bold,
    Italic,
    Strikethrough,
    Code,
    List,
    ListOrdered,
    Quote,
    Code2,
    Minus,
    Undo,
    Redo,
    Heading1,
    Heading2,
    Heading3,
    Pilcrow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEditorContext } from './editor-provider';
import { cn } from '@/lib/utils';

interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    tooltip: string;
    shortcut?: string;
    children: React.ReactNode;
}

function ToolbarButton({
    onClick,
    isActive,
    disabled,
    tooltip,
    shortcut,
    children,
}: ToolbarButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'h-7 w-7 rounded',
                        isActive && 'bg-accent text-accent-foreground'
                    )}
                    onClick={onClick}
                    disabled={disabled}
                >
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                <span>{tooltip}</span>
                {shortcut && <span className="ml-2 opacity-60 text-[10px]">{shortcut}</span>}
            </TooltipContent>
        </Tooltip>
    );
}

export function EditorToolbar() {
    const { editor, isReadonly } = useEditorContext();

    if (!editor) return null;

    return (
        <TooltipProvider delayDuration={300}>
            <div
                className={cn(
                    'h-10 border-b border-border bg-card flex items-center px-3 gap-0.5 flex-shrink-0 overflow-x-auto',
                    isReadonly && 'pointer-events-none opacity-40'
                )}
            >
                {/* 文本格式 */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    tooltip="加粗"
                    shortcut="⌘B"
                >
                    <Bold className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    tooltip="斜体"
                    shortcut="⌘I"
                >
                    <Italic className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                    tooltip="删除线"
                    shortcut="⌘⇧X"
                >
                    <Strikethrough className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    isActive={editor.isActive('code')}
                    disabled={!editor.can().chain().focus().toggleCode().run()}
                    tooltip="行内代码"
                    shortcut="⌘E"
                >
                    <Code className="h-3.5 w-3.5" />
                </ToolbarButton>

                <Separator orientation="vertical" className="mx-1 h-5" />

                {/* 段落格式 */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    isActive={editor.isActive('paragraph')}
                    tooltip="正文"
                    shortcut="⌘⌥0"
                >
                    <Pilcrow className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    tooltip="一级标题"
                    shortcut="⌘⌥1"
                >
                    <Heading1 className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    tooltip="二级标题"
                    shortcut="⌘⌥2"
                >
                    <Heading2 className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                    tooltip="三级标题"
                    shortcut="⌘⌥3"
                >
                    <Heading3 className="h-3.5 w-3.5" />
                </ToolbarButton>

                <Separator orientation="vertical" className="mx-1 h-5" />

                {/* 列表 */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    tooltip="无序列表"
                    shortcut="⌘⇧8"
                >
                    <List className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    tooltip="有序列表"
                    shortcut="⌘⇧7"
                >
                    <ListOrdered className="h-3.5 w-3.5" />
                </ToolbarButton>

                <Separator orientation="vertical" className="mx-1 h-5" />

                {/* 插入 */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    tooltip="引用"
                    shortcut="⌘⇧B"
                >
                    <Quote className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    tooltip="代码块"
                    shortcut="⌘⌥C"
                >
                    <Code2 className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    tooltip="分割线"
                >
                    <Minus className="h-3.5 w-3.5" />
                </ToolbarButton>

                <Separator orientation="vertical" className="mx-1 h-5" />

                {/* 历史操作（Yjs UndoManager，不使用 chain 的 can() 检查避免崩溃） */}
                <ToolbarButton
                    onClick={() => {
                        try {
                            editor.chain().focus().undo().run();
                        } catch {
                            /* noop */
                        }
                    }}
                    disabled={false}
                    tooltip="撤销"
                    shortcut="⌘Z"
                >
                    <Undo className="h-3.5 w-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => {
                        try {
                            editor.chain().focus().redo().run();
                        } catch {
                            /* noop */
                        }
                    }}
                    disabled={false}
                    tooltip="重做"
                    shortcut="⌘⇧Z"
                >
                    <Redo className="h-3.5 w-3.5" />
                </ToolbarButton>
            </div>
        </TooltipProvider>
    );
}
