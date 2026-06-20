import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
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

  @ValidateIf((o: { coverImage?: string }) => o.coverImage !== undefined && o.coverImage !== null && o.coverImage !== '')
  @IsString()
  @IsUrl()
  coverImage?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsString()
  status?: 'draft' | 'pending' | 'published';
}
