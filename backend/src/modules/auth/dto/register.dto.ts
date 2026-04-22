import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import type { RegisterCredentials } from '@collab/types';

export class RegisterDto implements RegisterCredentials {
    @IsEmail({}, { message: '邮箱格式不正确' })
    email!: string;

    @IsString({ message: '用户名必须是字符串' })
    @MinLength(3, { message: '用户名至少 3 个字符' })
    @MaxLength(30, { message: '用户名最多 30 个字符' })
    username!: string;

    @IsString({ message: '密码必须是字符串' })
    @MinLength(8, { message: '密码至少 8 个字符' })
    @MaxLength(128, { message: '密码最多 128 个字符' })
    password!: string;

    @IsOptional()
    @IsString({ message: '昵称必须是字符串' })
    @MaxLength(50, { message: '昵称最多 50 个字符' })
    nickname?: string;
}
