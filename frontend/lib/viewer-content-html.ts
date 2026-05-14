import { base64ToHtml } from '@/lib/editor/yjs-to-html';

/** 查看页：将后端返回的 Yjs Base64 转为可渲染 HTML（与 ViewerPage / 刷新保持一致） */
export function buildViewerContentHtml(contentBase64: string | undefined): string {
    if (!contentBase64) return '';
    try {
        return base64ToHtml(contentBase64);
    } catch {
        return '<p>内容加载失败</p>';
    }
}
