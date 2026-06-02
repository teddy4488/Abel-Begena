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

  @Prop({ trim: true, maxlength: 5000 })
  description?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0, default: 0 })
  stock: number;

  /**
   * When stock falls to or below this value, the product should be considered
   * low on inventory and surfaced in admin dashboards/alerts.
   */
  @Prop({ min: 0, default: 0 })
  lowStockThreshold?: number;

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

  @Prop({ type: Date, required: false, default: null })
  deletedAt?: Date | null;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
