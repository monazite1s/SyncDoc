import { IsString, IsEnum } from 'class-validator';

export class AddCollaboratorDto {
    @IsString({ message: '用户 ID 必须是字符串' })
    userId!: string;

    @IsEnum(['EDITOR', 'VIEWER'] as const, {
        message: '角色必须是 EDITOR 或 VIEWER',
    })
    role!: 'EDITOR' | 'VIEWER';
}
