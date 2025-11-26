import {
  IsString,
  IsEnum,
  IsObject,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../schemas/order.schema';

class ShippingAddressDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CheckoutDto {
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  @IsObject()
  shippingAddress: ShippingAddressDto;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
