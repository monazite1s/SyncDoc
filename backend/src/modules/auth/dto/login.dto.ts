import { IsEmail, IsString } from 'class-validator';
import type { LoginCredentials } from '@collab/types';

export class LoginDto implements LoginCredentials {
    @IsEmail({}, { message: '邮箱格式不正确' })
    email!: string;

    @IsString({ message: '密码必须是字符串' })
    password!: string;
}
