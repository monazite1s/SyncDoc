import htmldiff from 'htmldiff-js';
import { base64ToHtml } from './yjs-to-html';

/**
 * 生成版本内容的内联高亮 diff HTML
 */
export function generateInlineDiff(currentBase64: string, prevBase64: string | null): string {
    const currentHtml = base64ToHtml(currentBase64);

    if (!prevBase64) {
        return `<div class="version-diff-all-new">${currentHtml}</div>`;
    }

    const prevHtml = base64ToHtml(prevBase64);
    return htmldiff.execute(prevHtml, currentHtml);
}
