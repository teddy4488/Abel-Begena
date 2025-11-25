import { IsString, IsInt } from 'class-validator';

export class AddToCartDto {
  @IsString()
  productId: string;

  @IsInt()
  quantity: number;
}

