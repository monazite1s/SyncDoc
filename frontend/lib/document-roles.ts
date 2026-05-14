import type { CollaboratorRole } from '@collab/types';

/** 当前用户在文档内的角色文案（文档列表 / 预览 / 分享弹窗统一使用） */
export const DOCUMENT_ROLE_LABELS: Record<CollaboratorRole, string> = {
    OWNER: '所有者',
    ADMIN: '管理员',
    EDITOR: '编辑者',
    VIEWER: '查看者',
};

export function formatDocumentRole(role: CollaboratorRole | null | undefined): string {
    if (!role) return '—';
    return DOCUMENT_ROLE_LABELS[role] ?? role;
}
