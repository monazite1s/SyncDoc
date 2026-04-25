import { api } from './client';
import type {
    DocumentVersionItem,
    DocumentVersionDetail,
    VersionDiffRequest,
    VersionDiffResponse,
    CreateVersionRequest,
} from '@collab/types';

export interface VersionListResponse {
    items: DocumentVersionItem[];
    total: number;
    page: number;
    limit: number;
}

export const versionsApi = {
    // 获取版本列表
    list: (documentId: string, page?: number, limit?: number) =>
        api.get<VersionListResponse>(
            `/documents/${documentId}/versions?page=${page ?? 1}&limit=${limit ?? 20}`
        ),

    // 创建快照
    create: (documentId: string, data?: CreateVersionRequest) =>
        api.post<DocumentVersionItem>(`/documents/${documentId}/versions`, data ?? {}),

    // 获取单个版本内容
    get: (documentId: string, version: number) =>
        api.get<DocumentVersionDetail>(`/documents/${documentId}/versions/${version}`),

    // 恢复版本
    restore: (documentId: string, version: number) =>
        api.post<DocumentVersionItem>(`/documents/${documentId}/versions/${version}/restore`),

    // 更新版本标签
    updateLabel: (documentId: string, version: number, label?: string) =>
        api.patch<DocumentVersionItem>(`/documents/${documentId}/versions/${version}/label`, {
            label,
        }),

    // 版本 Diff
    diff: (documentId: string, data: VersionDiffRequest) =>
        api.post<VersionDiffResponse>(`/documents/${documentId}/versions/diff`, data),
};
