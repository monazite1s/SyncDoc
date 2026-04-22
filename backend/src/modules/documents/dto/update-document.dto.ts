import { IsString, MinLength, MaxLength, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { DocumentStatus } from '@prisma/client';
import type { UpdateDocumentRequest } from '@collab/types';

export class UpdateDocumentDto implements UpdateDocumentRequest {
    @IsOptional()
    @IsString({ message: '标题必须是字符串' })
    @MinLength(1, { message: '标题不能为空' })
    @MaxLength(200, { message: '标题最多 200 个字符' })
    title?: string;

    @IsOptional()
    @IsString({ message: '描述必须是字符串' })
    @MaxLength(1000, { message: '描述最多 1000 个字符' })
    description?: string;

    @IsOptional()
    @IsBoolean({ message: 'isPublic 必须是布尔值' })
    isPublic?: boolean;

    @IsOptional()
    @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const, {
        message: '状态必须是 DRAFT、PUBLISHED 或 ARCHIVED',
    })
    status?: Exclude<DocumentStatus, 'DELETED'>;
}
