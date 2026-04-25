import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateVersionLabelDto {
    @IsOptional()
    @IsString()
    @MaxLength(50)
    label?: string;
}
