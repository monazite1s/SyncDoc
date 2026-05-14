import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateShareLinkDto {
    @IsEnum(['VIEWER', 'EDITOR'] as const, {
        message: '角色必须是 VIEWER 或 EDITOR',
    })
    role!: 'VIEWER' | 'EDITOR';

    @IsOptional()
    @IsString()
    expiresAt?: string;

    @IsOptional()
    @IsString()
    password?: string;
}
