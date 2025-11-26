import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateContentBlockDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9._-]+$/i, {
    message:
      'Key may only contain letters, numbers, dots, underscores, or dashes',
  })
  key: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @IsString()
  @IsNotEmpty()
  en: string;

  @IsString()
  @IsNotEmpty()
  am: string;
}
