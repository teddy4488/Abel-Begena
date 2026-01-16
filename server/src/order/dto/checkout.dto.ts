import {
  IsString,
  IsEnum,
  IsObject,
  ValidateNested,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, DeliveryOption } from '../schemas/order.schema';

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
  @IsEnum(DeliveryOption)
  deliveryOption: DeliveryOption;

  @ValidateIf((o) => o.deliveryOption === DeliveryOption.PICKUP)
  @IsMongoId()
  @IsNotEmpty()
  pickupBranchId?: string;

  @ValidateIf((o) => o.deliveryOption === DeliveryOption.DELIVERY)
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  @IsObject()
  shippingAddress?: ShippingAddressDto;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
