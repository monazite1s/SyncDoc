import htmldiff from 'htmldiff-js';
import { base64ToHtml } from './yjs-to-html';
import type { VersionDiffChange } from '@collab/types';

/**
 * 生成版本内容的内联高亮 diff HTML（旧版兼容，用于预览时 Base64 diff）
 */
export function generateInlineDiff(currentBase64: string, prevBase64: string | null): string {
    const currentHtml = base64ToHtml(currentBase64);

    if (!prevBase64) {
        return `<div class="version-diff-all-new">${currentHtml}</div>`;
    }

    const prevHtml = base64ToHtml(prevBase64);
    return htmldiff.execute(prevHtml, currentHtml);
}

/**
 * 将结构化 diff 变更渲染为 inline HTML
 */
export function structuredDiffToInlineHtml(changes: VersionDiffChange[]): string {
    return changes
        .map((change) => {
            const escaped = change.content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            switch (change.type) {
                case 'added':
                    return `<div class="diff-line diff-added"><span class="diff-marker">+</span> ${escaped}</div>`;
                case 'removed':
                    return `<div class="diff-line diff-removed"><span class="diff-marker">-</span> ${escaped}</div>`;
                default:
                    return `<div class="diff-line diff-unchanged"><span class="diff-marker"> </span> ${escaped}</div>`;
            }
        })
        .join('');
}

/**
 * 将结构化 diff 变更渲染为 side-by-side HTML（左右对比）
 */
export function structuredDiffToSideBySideHtml(changes: VersionDiffChange[]): {
    left: string;
    right: string;
} {
    const leftParts: string[] = [];
    const rightParts: string[] = [];

    for (const change of changes) {
        const escaped = change.content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        switch (change.type) {
            case 'added':
                leftParts.push(`<div class="diff-line diff-empty">&nbsp;</div>`);
                rightParts.push(`<div class="diff-line diff-added">${escaped}</div>`);
                break;
            case 'removed':
                leftParts.push(`<div class="diff-line diff-removed">${escaped}</div>`);
                rightParts.push(`<div class="diff-line diff-empty">&nbsp;</div>`);
                break;
            default:
                leftParts.push(`<div class="diff-line diff-unchanged">${escaped}</div>`);
                rightParts.push(`<div class="diff-line diff-unchanged">${escaped}</div>`);
                break;
        }
    }

    return { left: leftParts.join(''), right: rightParts.join('') };
}
