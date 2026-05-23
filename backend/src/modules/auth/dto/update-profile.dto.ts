import { IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';
import type { UpdateProfileRequest } from '@collab/types';

export class UpdateProfileDto implements UpdateProfileRequest {
    @IsOptional()
    @IsString({ message: '昵称必须是字符串' })
    @MaxLength(50, { message: '昵称最多 50 个字符' })
    nickname?: string;

    @IsOptional()
    @IsString({ message: '个人简介必须是字符串' })
    @MaxLength(300, { message: '个人简介最多 300 个字符' })
    bio?: string;

    @IsOptional()
    @IsString({ message: '手机号必须是字符串' })
    @MaxLength(20, { message: '手机号最多 20 个字符' })
    phone?: string;

    @IsOptional()
    // 仅在非空时校验 URL 格式，空字符串代表清除该字段
    @ValidateIf((o: UpdateProfileDto) => !!o.website?.trim())
    @IsString({ message: '个人网站必须是字符串' })
    @IsUrl({ require_tld: false }, { message: '个人网站格式不正确（示例：https://example.com）' })
    @MaxLength(200, { message: '个人网站最多 200 个字符' })
    website?: string;

    @IsOptional()
    @IsString({ message: '所在地必须是字符串' })
    @MaxLength(100, { message: '所在地最多 100 个字符' })
    location?: string;
}
