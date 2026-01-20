import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CartItem, CartItemSchema } from './cart-item.schema';

export type OrderDocument = Order & Document;

export enum PaymentMethod {
  BANK_TRANSFER = 'BankTransfer',
  CASH_ON_DELIVERY = 'CashOnDelivery',
  OTHER = 'Other',
}

export enum DeliveryOption {
  PICKUP = 'Pickup',
  DELIVERY = 'Delivery',
}

export enum OrderStatus {
  PENDING = 'Pending',
  PAYMENT_PENDING = 'PaymentPending',
  PROCESSING = 'Processing',
  SHIPPED = 'Shipped',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: [CartItemSchema], required: true })
  items: CartItem[];

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({
    type: {
      city: String,
      street: String,
      postalCode: String,
      phone: String,
    },
    required: false,
  })
  shippingAddress?: {
    city: string;
    street: string;
    postalCode: string;
    phone: string;
  };

  @Prop({
    required: true,
    enum: DeliveryOption,
    type: String,
  })
  deliveryOption: DeliveryOption;

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  pickupBranchId?: Types.ObjectId;

  @Prop({
    required: true,
    enum: PaymentMethod,
    type: String,
  })
  paymentMethod: PaymentMethod;

  @Prop({
    default: OrderStatus.PENDING,
    enum: OrderStatus,
    type: String,
  })
  status: OrderStatus;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop({ trim: true, maxlength: 500 })
  receiptUrl?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
