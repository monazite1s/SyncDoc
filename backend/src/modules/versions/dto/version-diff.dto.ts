import { IsInt, IsPositive } from 'class-validator';

export class VersionDiffDto {
    @IsInt()
    @IsPositive()
    fromVersion!: number;

    @IsInt()
    @IsPositive()
    toVersion!: number;
}
