import { api } from './client';
import type { Document } from '@collab/types';

export const documentsApi = {
    // Get all documents for current user
    getAll: () => api.get<Document[]>('/documents'),

    // Get document by ID
    getById: (id: string) => api.get<Document>(`/documents/${id}`),

    // Create new document
    create: (data: { title: string; description?: string }) =>
        api.post<Document>('/documents', data),

    // Update document
    update: (id: string, data: Partial<Document>) => api.put<Document>(`/documents/${id}`, data),

    // Delete document
    delete: (id: string) => api.delete<void>(`/documents/${id}`),

    // Add collaborator
    addCollaborator: (documentId: string, userId: string, role: string) =>
        api.post<void>(`/documents/${documentId}/collaborators`, {
            userId,
            role,
        }),

    // Remove collaborator
    removeCollaborator: (documentId: string, userId: string) =>
        api.delete<void>(`/documents/${documentId}/collaborators/${userId}`),
};
