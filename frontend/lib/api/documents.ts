import { api } from './client';
import type {
    DocumentListItem,
    DocumentDetail,
    DocumentViewContent,
    DocumentContentResponse,
    CreateDocumentRequest,
    UpdateDocumentRequest,
} from '@collab/types';

export const documentsApi = {
    // 获取用户可访问的所有文档（支持搜索）
    getAll: (search?: string) =>
        api.get<DocumentListItem[]>(
            search ? `/documents?search=${encodeURIComponent(search)}` : '/documents'
        ),

    // 获取文档详情（含协作者列表，编辑器页面使用）
    getById: (id: string) => api.get<DocumentDetail>(`/documents/${id}`),

    // 获取文档查看页内容（元信息 + Base64 编码的 Yjs 状态）
    getView: (id: string) => api.get<DocumentViewContent>(`/documents/${id}/view`),

    // 获取文档二进制内容（Base64）
    getContent: (id: string) => api.get<DocumentContentResponse>(`/documents/${id}/content`),

    // 创建文档（parentId 可选，传入时创建子文档）
    create: (data: CreateDocumentRequest) => api.post<DocumentListItem>('/documents', data),

    // 更新文档
    update: (id: string, data: UpdateDocumentRequest) =>
        api.put<DocumentListItem>(`/documents/${id}`, data),

    // 归档文档
    archive: (id: string) => api.put<DocumentListItem>(`/documents/${id}`, { status: 'ARCHIVED' }),

    // 恢复文档
    restore: (id: string) => api.put<DocumentListItem>(`/documents/${id}`, { status: 'DRAFT' }),

    // 删除文档 (软删除)
    delete: (id: string) => api.delete<void>(`/documents/${id}`),

    // 添加协作者
    addCollaborator: (documentId: string, userId: string, role: 'EDITOR' | 'VIEWER') =>
        api.post<void>(`/documents/${documentId}/collaborators`, {
            userId,
            role,
        }),

    // 移除协作者
    removeCollaborator: (documentId: string, userId: string) =>
        api.delete<void>(`/documents/${documentId}/collaborators/${userId}`),
};
