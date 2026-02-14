import { IsOptional, IsString, MinLength, IsArray } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagList?: string[];
}
