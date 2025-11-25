import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { OrderStatus } from '../schemas/order.schema';

export class UpdateOrderStatusDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}

