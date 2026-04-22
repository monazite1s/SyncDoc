import { z } from 'zod';

// 创建文档验证 schema
export const createDocumentSchema = z.object({
    title: z.string().min(1, '标题不能为空').max(200, '标题最多 200 个字符'),
    description: z.string().max(1000, '描述最多 1000 个字符').optional(),
});

export type CreateDocumentFormData = z.infer<typeof createDocumentSchema>;

// 更新文档验证 schema
export const updateDocumentSchema = z.object({
    title: z.string().min(1, '标题不能为空').max(200, '标题最多 200 个字符').optional(),
    description: z.string().max(1000, '描述最多 1000 个字符').optional(),
    isPublic: z.boolean().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export type UpdateDocumentFormData = z.infer<typeof updateDocumentSchema>;
