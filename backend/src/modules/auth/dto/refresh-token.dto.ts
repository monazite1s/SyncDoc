import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
    @IsOptional()
    @IsString({ message: 'refreshToken 必须是字符串' })
    refreshToken?: string;
}
