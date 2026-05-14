import { api } from './client';

export const ownershipApi = {
    request: (documentId: string, targetUserId: string) =>
        api.post<{ success: boolean }>(`/documents/${documentId}/transfer-ownership`, {
            targetUserId,
        }),

    accept: (documentId: string) =>
        api.post<{ success: boolean }>(`/documents/${documentId}/accept-ownership`),

    cancel: (documentId: string) =>
        api.delete<{ success: boolean }>(`/documents/${documentId}/transfer-ownership`),
};
