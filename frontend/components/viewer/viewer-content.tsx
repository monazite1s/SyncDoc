'use client';

import { useMemo } from 'react';

interface ViewerContentProps {
    contentHtml: string;
}

function slugifyHeading(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5- ]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 48);
}

export function ViewerContent({ contentHtml }: ViewerContentProps) {
    const normalizedHtml = useMemo(() => {
        if (!contentHtml) return '<p class="text-muted-foreground">暂无内容</p>';
        if (typeof window === 'undefined') return contentHtml;

        const parser = new DOMParser();
        const doc = parser.parseFromString(contentHtml, 'text/html');
        const headings = Array.from(doc.querySelectorAll('h1, h2, h3'));
        headings.forEach((node, index) => {
            if (!node.id) {
                const text = node.textContent?.trim() || `section-${index + 1}`;
                node.setAttribute('id', `${slugifyHeading(text) || 'section'}-${index + 1}`);
            }
        });

        return doc.body.innerHTML;
    }, [contentHtml]);

    return (
        <main className="flex-1 overflow-auto" data-doc-scroll-root>
            <div className="max-w-[800px] mx-auto px-6 py-8">
                <div
                    data-doc-content
                    className="prose-editor ProseMirror"
                    dangerouslySetInnerHTML={{ __html: normalizedHtml }}
                />
            </div>
        </main>
    );
}
