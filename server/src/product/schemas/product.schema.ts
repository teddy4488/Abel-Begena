import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

export enum InstrumentType {
  BEGENA = 'Begena',
  KIRAR = 'Kirar',
  MASINKO = 'Masinko',
  WASHINT = 'Washint',
  KEBERO = 'Kebero',
  OTHER = 'Other',
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    enum: InstrumentType,
    type: String,
  })
  instrumentType: InstrumentType;

  @Prop()
  shortDescription?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0, default: 0 })
  stock: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: Object, default: {} })
  attributes?: Record<string, unknown>;

  @Prop({ min: 0 })
  discountPrice?: number;

  @Prop({ default: false })
  promoActive: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
