import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'refreshToken 必须是字符串' })
  refreshToken!: string;
}
