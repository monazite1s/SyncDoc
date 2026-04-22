'use client';

import * as Y from 'yjs';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';

/**
 * 将 Yjs 二进制状态转换为 HTML 字符串
 * 创建临时 Tiptap Editor 实例，保证与编辑器扩展配置一致
 */
export function yjsStateToHtml(state: Uint8Array): string {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, state);

    const editor = new Editor({
        extensions: [
            StarterKit.configure({ history: false }),
            Collaboration.configure({ document: doc }),
        ],
        editable: false,
    });

    const html = editor.getHTML();
    editor.destroy();
    doc.destroy();
    return html;
}

/**
 * 将 Base64 编码的 Yjs 状态转换为 HTML
 */
export function base64ToHtml(base64: string): string {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return yjsStateToHtml(bytes);
}
