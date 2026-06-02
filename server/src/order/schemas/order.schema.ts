import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export enum PaymentMethod {
  BANK_TRANSFER = 'BankTransfer',
  TELEBIRR = 'Telebirr',
  CBE_BIRR = 'CBEBirr',
  CASH_ON_DELIVERY = 'CashOnDelivery',
  MANUAL = 'Manual',
  OTHER = 'Other',
}

export enum DeliveryOption {
  PICKUP = 'Pickup',
  DELIVERY = 'Delivery',
}

export enum OrderStatus {
  PENDING = 'Pending',
  PAYMENT_PENDING = 'PaymentPending',
  PAYMENT_REJECTED = 'PaymentRejected',
  PROCESSING = 'Processing',
  SHIPPED = 'Shipped',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
}

/**
 * Statuses in which product stock has been reserved/decremented for an order.
 * - COD orders reserve stock at checkout (PENDING).
 * - Offline-payment orders reserve stock on approval (PROCESSING onward).
 * PAYMENT_PENDING / PAYMENT_REJECTED / CANCELLED hold no reserved stock.
 */
export const STOCK_RESERVED_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.PENDING,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
]);

export function isStockReserved(status: OrderStatus): boolean {
  return STOCK_RESERVED_STATUSES.has(status);
}

@Schema({ _id: true })
export class OrderItem {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  /** Snapshot of the product name at checkout time (survives later rename/delete). */
  @Prop({ trim: true, maxlength: 200 })
  productName: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  priceAtCheckout: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

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

  @Prop({ trim: true, maxlength: 120 })
  trackingNumber?: string;

  @Prop({ trim: true, maxlength: 80 })
  trackingCarrier?: string;

  @Prop({ type: Date, required: false, default: null })
  deletedAt?: Date | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
// Index to support user order history and admin reporting
OrderSchema.index({ user: 1, status: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });