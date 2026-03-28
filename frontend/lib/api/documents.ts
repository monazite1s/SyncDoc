import apiClient from './client';
import type { Document, ApiResponse } from '@/types';

export const documentsApi = {
    // Get all documents for current user
    getAll: () => apiClient.get<ApiResponse<Document[]>>('/documents'),

    // Get document by ID
    getById: (id: string) => apiClient.get<ApiResponse<Document>>(`/documents/${id}`),

    // Create new document
    create: (data: { title: string; description?: string }) =>
        apiClient.post<ApiResponse<Document>>('/documents', data),

    // Update document
    update: (id: string, data: Partial<Document>) =>
        apiClient.put<ApiResponse<Document>>(`/documents/${id}`, data),

    // Delete document
    delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/documents/${id}`),

    // Add collaborator
    addCollaborator: (documentId: string, userId: string, role: string) =>
        apiClient.post<ApiResponse<void>>(`/documents/${documentId}/collaborators`, {
            userId,
            role,
        }),

    // Remove collaborator
    removeCollaborator: (documentId: string, userId: string) =>
        apiClient.delete<ApiResponse<void>>(`/documents/${documentId}/collaborators/${userId}`),
};
