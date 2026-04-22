/** 6 种协同光标颜色，与 tailwind.config.ts 中 collaboration 色板对齐 */
const CURSOR_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#a29bfe'] as const;

/**
 * 根据用户 ID hash 分配固定颜色，保证同一用户颜色始终一致
 */
export function getCursorColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
    }
    return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}
