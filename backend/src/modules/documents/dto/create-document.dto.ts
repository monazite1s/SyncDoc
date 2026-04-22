import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import type { CreateDocumentRequest } from '@collab/types';

export class CreateDocumentDto implements CreateDocumentRequest {
    @IsString({ message: '标题必须是字符串' })
    @MinLength(1, { message: '标题不能为空' })
    @MaxLength(200, { message: '标题最多 200 个字符' })
    title!: string;

    @IsOptional()
    @IsString({ message: '描述必须是字符串' })
    @MaxLength(1000, { message: '描述最多 1000 个字符' })
    description?: string;
}
