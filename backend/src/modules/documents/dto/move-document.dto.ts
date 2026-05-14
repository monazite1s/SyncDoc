import { IsOptional, IsString, IsInt, Min, IsNotEmpty, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class MoveDocumentDto {
    @IsOptional()
    @ValidateIf((o) => o.parentId !== null)
    @IsString({ message: 'parentId 必须是字符串' })
    @IsNotEmpty({ message: 'parentId 不能为空字符串' })
    parentId?: string | null;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'position 必须是整数' })
    @Min(0, { message: 'position 不能为负数' })
    position?: number;
}
