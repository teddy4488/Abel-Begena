import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUrl()
  @IsNotEmpty()
  coverImage: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
