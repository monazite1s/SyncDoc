import { api } from './client';

export interface ShareLinkItem {
    id: string;
    token: string;
    role: 'VIEWER' | 'EDITOR';
    expiresAt: string | null;
    hasPassword: boolean;
    createdAt: string;
    createdBy: { id: string; username: string; nickname: string | null };
}

export interface ShareAccessResponse {
    requiresPassword: boolean;
    documentTitle?: string;
    document?: {
        id: string;
        title: string;
        description: string | null;
        author: { id: string; username: string; nickname: string | null; avatar: string | null };
        role: 'VIEWER' | 'EDITOR';
        contentBase64: string | null;
    };
}

export const shareApi = {
    create: (
        documentId: string,
        data: {
            role: 'VIEWER' | 'EDITOR';
            expiresAt?: string;
            password?: string;
        }
    ) => api.post<ShareLinkItem>(`/documents/${documentId}/share-links`, data),

    list: (documentId: string) => api.get<ShareLinkItem[]>(`/documents/${documentId}/share-links`),

    revoke: (documentId: string, linkId: string) =>
        api.delete<void>(`/documents/${documentId}/share-links/${linkId}`),

    access: (token: string, password?: string) =>
        api.post<ShareAccessResponse>(`/share/${token}`, password ? { password } : {}),
};
