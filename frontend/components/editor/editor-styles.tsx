'use client';

/**
 * 编辑器扩展样式注入
 * 为表格、图片等扩展元素提供基础 CSS
 */
export function EditorStyles() {
    return (
        <style
            dangerouslySetInnerHTML={{
                __html: `
                    /* 表格样式 */
                    .ProseMirror table {
                        border-collapse: collapse;
                        table-layout: fixed;
                        width: 100%;
                        margin: 1em 0;
                        overflow: hidden;
                    }
                    .ProseMirror table td,
                    .ProseMirror table th {
                        border: 1px solid var(--border);
                        padding: 6px 8px;
                        min-width: 80px;
                        vertical-align: top;
                        box-sizing: border-box;
                        position: relative;
                    }
                    .ProseMirror table th {
                        background: var(--muted);
                        font-weight: 600;
                        text-align: left;
                    }
                    .ProseMirror table .selectedCell {
                        background: var(--accent);
                    }
                    .ProseMirror table .column-resize-handle {
                        position: absolute;
                        right: -2px;
                        top: 0;
                        bottom: -2px;
                        width: 4px;
                        background-color: var(--primary);
                        pointer-events: none;
                    }

                    /* 图片样式 */
                    .ProseMirror img {
                        max-width: 100%;
                        height: auto;
                        border-radius: 4px;
                        margin: 0.5em 0;
                    }
                    .ProseMirror img.ProseMirror-selectednode {
                        outline: 2px solid var(--primary);
                        outline-offset: 2px;
                    }
                `,
            }}
        />
    );
}
