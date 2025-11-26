import { IsString, IsInt, IsMongoId } from 'class-validator';

export class AddToCartDto {
  @IsString()
  @IsMongoId()
  productId: string;

  @IsInt()
  quantity: number;
}
