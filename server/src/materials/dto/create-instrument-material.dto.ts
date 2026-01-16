import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { InstrumentType } from '../../product/schemas/product.schema';

export class CreateInstrumentMaterialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsEnum(InstrumentType)
  instrumentType: InstrumentType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
