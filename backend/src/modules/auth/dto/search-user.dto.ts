import { IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class SearchUserDto {
    @IsString()
    @MinLength(1)
    keyword!: string;

    @IsOptional()
    @IsIn(['username', 'email'])
    field?: 'username' | 'email';
}
