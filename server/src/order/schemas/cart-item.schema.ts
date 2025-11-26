import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CartItemDocument = CartItem & Document;

@Schema({ _id: false })
export class CartItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  priceAtCheckout: number;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);
