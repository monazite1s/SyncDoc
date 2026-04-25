'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import { useAuthStore } from '@/stores/auth.store';
import { getCursorColor } from '@/lib/editor/cursor-colors';
import { useEditorContext } from './editor-provider';
import { cn } from '@/lib/utils';

interface TiptapEditorProps {
    className?: string;
}

export function TiptapEditor({ className }: TiptapEditorProps) {
    const { ydoc, provider, isReadonly, setEditor } = useEditorContext();
    const user = useAuthStore((s) => s.user);
    const initialized = useRef(false);

    const cursorColor = user ? getCursorColor(user.id) : '#a29bfe';
    const displayName = user?.nickname ?? user?.username ?? '匿名用户';

    const editor = useEditor(
        {
            extensions: [
                StarterKit.configure({
                    // Yjs 自带 undo/redo，禁用内置 history 避免冲突
                    history: false,
                }),
                Placeholder.configure({
                    placeholder: '开始编写文档...',
                }),
                CharacterCount,
                Table.configure({
                    resizable: false,
                }),
                TableRow,
                TableCell,
                TableHeader,
                Image.configure({
                    inline: false,
                    allowBase64: true,
                }),
                ...(ydoc
                    ? [
                          Collaboration.configure({ document: ydoc }),
                          ...(provider
                              ? [
                                    CollaborationCursor.configure({
                                        provider,
                                        user: { name: displayName, color: cursorColor },
                                    }),
                                ]
                              : []),
                      ]
                    : []),
            ],
            editable: !isReadonly,
            immediatelyRender: false,
            editorProps: {
                attributes: {
                    class: 'prose-editor focus:outline-none',
                    spellcheck: 'false',
                },
            },
        },
        [ydoc, provider, isReadonly]
    );

    // 将 editor 实例暴露给 Context：必须等 ydoc 就绪（Collaboration 已加载）才暴露
    // 避免工具栏拿到没有 undo/redo 命令的 editor 实例
    useEffect(() => {
        if (!initialized.current && editor && ydoc) {
            initialized.current = true;
            setEditor(editor);
        }
        return () => {
            if (initialized.current) {
                setEditor(null);
                initialized.current = false;
            }
        };
    }, [editor, setEditor, ydoc]);

    // 外部 isReadonly 变化时同步
    useEffect(() => {
        if (editor && editor.isEditable === isReadonly) {
            editor.setEditable(!isReadonly);
        }
    }, [editor, isReadonly]);

    if (!ydoc || !provider) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                正在连接协同服务器...
            </div>
        );
    }

    return (
        <div className={cn('flex-1 overflow-auto bg-background', className)}>
            <EditorContent editor={editor} className="h-full" />
        </div>
    );
}
