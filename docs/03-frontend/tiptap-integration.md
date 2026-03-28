# Tiptap 编辑器集成

## 概述

本文档描述如何在 Next.js 15 项目中集成 Tiptap 3 编辑器，并配置 Yjs 协同编辑功能。

## 安装依赖

```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/pm
pnpm add @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor
pnpm add yjs y-websocket
```

## 基础配置

### 编辑器组件

```tsx
// components/editor/editor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MenuBar } from './menu-bar';
import { useUser } from '@/hooks/use-auth';

interface EditorProps {
    documentId: string;
    className?: string;
}

export function DocumentEditor({ documentId, className }: EditorProps) {
    const user = useUser();

    // Yjs 文档和 Provider
    const { ydoc, provider } = useYjsProvider(documentId);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: false, // 禁用本地历史，使用 Yjs
            }),
            Collaboration.configure({
                document: ydoc,
                field: 'content',
            }),
            CollaborationCursor.configure({
                provider,
                user: {
                    id: user.id,
                    name: user.name,
                    color: getRandomColor(),
                },
            }),
        ],
        immediatelyRender: false, // 避免 SSR 警告
    });

    if (!editor) {
        return <EditorSkeleton />;
    }

    return (
        <div className={cn('flex flex-col h-full', className)}>
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className="flex-1 overflow-auto" />
            <StatusBar provider={provider} />
        </div>
    );
}

// Yjs Provider Hook
function useYjsProvider(documentId: string) {
    const [state, setState] = useState<{
        ydoc: Y.Doc | null;
        provider: WebsocketProvider | null;
    }>({ ydoc: null, provider: null });

    useEffect(() => {
        const ydoc = new Y.Doc();
        const provider = new WebsocketProvider(process.env.NEXT_PUBLIC_WS_URL!, documentId, ydoc, {
            connect: true,
        });

        // 认证
        provider.on('open', () => {
            const token = getAccessToken();
            provider.send({
                type: 'auth',
                token,
            });
        });

        setState({ ydoc, provider });

        return () => {
            provider.disconnect();
            ydoc.destroy();
        };
    }, [documentId]);

    return state;
}

// 随机颜色生成
function getRandomColor(): string {
    const colors = [
        '#f43f5e', // rose
        '#8b5cf6', // violet
        '#3b82f6', // blue
        '#10b981', // emerald
        '#f59e0b', // amber
        '#ec4899', // pink
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}
```

### 菜单栏组件

```tsx
// components/editor/menu-bar.tsx
import { Editor } from '@tiptap/react';
import { Bold, Italic, Strike, Code, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toolbar } from '@/components/ui/toolbar';

interface MenuBarProps {
    editor: Editor;
}

export function MenuBar({ editor }: MenuBarProps) {
    return (
        <Toolbar className="border-b">
            <ButtonGroup>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive('bold')}
                    tooltip="Bold (Ctrl+B)"
                >
                    <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive('italic')}
                    tooltip="Italic (Ctrl+I)"
                >
                    <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    active={editor.isActive('strike')}
                    tooltip="Strikethrough"
                >
                    <Strike className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    active={editor.isActive('code')}
                    tooltip="Code"
                >
                    <Code className="h-4 w-4" />
                </ToolbarButton>
            </ButtonGroup>

            <Separator orientation="vertical" className="h-6" />

            <ButtonGroup>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={editor.isActive('bulletList')}
                    tooltip="Bullet List"
                >
                    <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={editor.isActive('orderedList')}
                    tooltip="Numbered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    active={editor.isActive('blockquote')}
                    tooltip="Quote"
                >
                    <Quote className="h-4 w-4" />
                </ToolbarButton>
            </ButtonGroup>

            <Separator orientation="vertical" className="h-6" />

            <ButtonGroup>
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    tooltip="Undo (Ctrl+Z)"
                >
                    <Undo className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    tooltip="Redo (Ctrl+Y)"
                >
                    <Redo className="h-4 w-4" />
                </ToolbarButton>
            </ButtonGroup>
        </Toolbar>
    );
}
```

### 状态栏组件

```tsx
// components/editor/status-bar.tsx
import { WebsocketProvider } from 'y-websocket';
import { useConnectionStatus } from '@/hooks/use-websocket';
import { CollaboratorAvatars } from '@/components/collaboration/collaborator-avatars';

interface StatusBarProps {
    provider: WebsocketProvider;
}

export function StatusBar({ provider }: StatusBarProps) {
    const status = useConnectionStatus(provider);

    return (
        <div className="flex items-center justify-between px-4 py-2 border-t text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
                <ConnectionIndicator status={status} />
                <span>
                    {status === 'connected' && 'Connected'}
                    {status === 'connecting' && 'Connecting...'}
                    {status === 'disconnected' && 'Offline'}
                </span>
            </div>
            <CollaboratorAvatars provider={provider} />
        </div>
    );
}

function ConnectionIndicator({ status }: { status: string }) {
    return (
        <span
            className={cn(
                'h-2 w-2 rounded-full',
                status === 'connected' && 'bg-green-500',
                status === 'connecting' && 'bg-yellow-500 animate-pulse',
                status === 'disconnected' && 'bg-red-500'
            )}
        />
    );
}
```

## 自定义扩展

### 高亮扩展

```tsx
// components/editor/extensions/highlight.tsx
import { Mark, mergeAttributes } from '@tiptap/core';

export interface HighlightOptions {
    multicolor: boolean;
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        highlight: {
            setHighlight: (color?: string) => ReturnType;
            toggleHighlight: (color?: string) => ReturnType;
            unsetHighlight: () => ReturnType;
        };
    }
}

export const Highlight = Mark.create<HighlightOptions>({
    name: 'highlight',

    addOptions() {
        return {
            multicolor: true,
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        if (!this.options.multicolor) {
            return {};
        }

        return {
            color: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-color'),
                renderHTML: (attributes) => {
                    if (!attributes.color) {
                        return {};
                    }
                    return {
                        'data-color': attributes.color,
                        style: `background-color: ${attributes.color}`,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [{ tag: 'mark' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['mark', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },

    addCommands() {
        return {
            setHighlight:
                (color) =>
                ({ commands }) => {
                    return commands.setMark(this.name, { color });
                },
            toggleHighlight:
                (color) =>
                ({ commands }) => {
                    return commands.toggleMark(this.name, { color });
                },
            unsetHighlight:
                () =>
                ({ commands }) => {
                    return commands.unsetMark(this.name);
                },
        };
    },
});
```

### 占位符扩展

```tsx
// components/editor/extensions/placeholder.tsx
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface PlaceholderOptions {
    placeholder: string;
    includeChildren: boolean;
}

export const Placeholder = Extension.create<PlaceholderOptions>({
    name: 'placeholder',

    addOptions() {
        return {
            placeholder: 'Start typing...',
            includeChildren: false,
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('placeholder'),
                props: {
                    decorations: ({ doc, selection }) => {
                        const { $anchor } = selection;
                        const node = doc.child($anchor.before());

                        // 只在文档为空时显示
                        if (doc.content.size > 2) {
                            return null;
                        }

                        // 创建装饰器
                        const decoration = Decoration.node(0, doc.content.size, {
                            'data-placeholder': this.options.placeholder,
                            class: 'is-empty',
                        });

                        return DecorationSet.create(doc, [decoration]);
                    },
                },
            }),
        ];
    },
});
```

## 编辑器样式

```css
/* styles/editor.css */

/* 基础编辑器样式 */
.tiptap {
    @apply p-4 outline-none min-h-full;
}

.tiptap.is-empty::before {
    @apply text-muted-foreground float-left h-0 pointer-events-none;
    content: attr(data-placeholder);
}

/* 标题样式 */
.tiptap h1 {
    @apply text-3xl font-bold mb-4;
}

.tiptap h2 {
    @apply text-2xl font-bold mb-3;
}

.tiptap h3 {
    @apply text-xl font-bold mb-2;
}

/* 列表样式 */
.tiptap ul {
    @apply list-disc pl-6;
}

.tiptap ol {
    @apply list-decimal pl-6;
}

/* 引用样式 */
.tiptap blockquote {
    @apply border-l-4 border-primary pl-4 italic;
}

/* 代码样式 */
.tiptap code {
    @apply bg-muted px-1 py-0.5 rounded text-sm font-mono;
}

.tiptap pre {
    @apply bg-muted p-4 rounded-lg overflow-x-auto;
}

.tiptap pre code {
    @apply bg-transparent p-0;
}

/* 协作光标样式 */
.collaboration-cursor__caret {
    @apply relative ml-[-1px] border-r-2;
}

.collaboration-cursor__label {
    @apply absolute top-[-1.5em] left-[-1px] text-xs px-1 py-0.5 rounded text-white whitespace-nowrap;
}

/* 选区样式 */
.tiptap .selection {
    @apply bg-primary/20;
}

/* 高亮样式 */
.tiptap mark {
    @apply bg-yellow-200 px-0.5 rounded;
}
```

## 协作光标样式

```tsx
// 在 CollaborationCursor 配置中自定义渲染
CollaborationCursor.configure({
  provider,
  user: {
    id: user.id,
    name: user.name,
    color: user.color,
  },
  render: (user) => {
    const cursor = document.createElement('span');
    cursor.classList.add('collaboration-cursor__caret');
    cursor.style.borderColor = user.color;

    const label = document.createElement('span');
    label.classList.add('collaboration-cursor__label');
    label.style.backgroundColor = user.color;
    label.textContent = user.name;

    cursor.appendChild(label);

    return cursor;
  },
}),
```

## 键盘快捷键

```typescript
// 编辑器快捷键配置
const keyboardShortcuts = {
    'Mod-b': 'toggleBold',
    'Mod-i': 'toggleItalic',
    'Mod-u': 'toggleUnderline',
    'Mod-s': 'saveDocument',
    'Mod-z': 'undo',
    'Mod-y': 'redo',
    'Mod-Shift-z': 'redo',
    'Mod-Shift-s': 'createVersion',
};

// 在扩展中添加快捷键
const editor = useEditor({
    extensions: [
        // ...
    ],
    editorProps: {
        handleKeyDown: (view, event) => {
            const shortcut = `${event.metaKey || event.ctrlKey ? 'Mod-' : ''}${event.key}`;
            // 处理快捷键
        },
    },
});
```

## 相关文档

- [Yjs 客户端配置](./yjs-client.md)
- [错误处理与边界](./error-handling.md)
- [协同核心文档](../05-collaboration/README.md)
