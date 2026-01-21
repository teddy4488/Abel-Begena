import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

/**
 * Embedded item schema used by both Cart and Order.
 * We explicitly provide an _id default to avoid "document must have an _id before saving"
 * errors with certain nested-array save paths.
 */
@Schema({ _id: true })
export class CartItem {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  priceAtCheckout: number;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);
