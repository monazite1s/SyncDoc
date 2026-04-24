import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import type { UpdateProfileRequest } from '@collab/types';

export class UpdateProfileDto implements UpdateProfileRequest {
    @IsOptional()
    @IsString({ message: '昵称必须是字符串' })
    @MaxLength(50, { message: '昵称最多 50 个字符' })
    nickname?: string;

    @IsOptional()
    @IsString({ message: '头像地址必须是字符串' })
    @IsUrl({ require_tld: false }, { message: '头像地址格式不正确' })
    @MaxLength(500, { message: '头像地址最多 500 个字符' })
    avatar?: string;
}
