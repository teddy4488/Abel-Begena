import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';
import { InstrumentType } from '../schemas/product.schema';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsEnum(InstrumentType)
  instrumentType: InstrumentType;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPrice?: number;

  @IsOptional()
  @IsBoolean()
  promoActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
