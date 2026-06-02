import { IsArray, IsString } from 'class-validator';

export class UpdateProductImagesDto {
  /** Full, ordered list of image URLs that should replace the product's current images. */
  @IsArray()
  @IsString({ each: true })
  images: string[];
}
