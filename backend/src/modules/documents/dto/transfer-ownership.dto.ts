import { IsString } from 'class-validator';

export class TransferOwnershipDto {
    @IsString({ message: '目标用户 ID 必须是字符串' })
    targetUserId!: string;
}
