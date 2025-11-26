import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContentBlockDocument = ContentBlock & Document;

@Schema({ timestamps: true })
export class ContentBlock {
  @Prop({ required: true, unique: true, trim: true })
  key: string;

  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: {
      en: { type: String, required: true, default: '' },
      am: { type: String, required: true, default: '' },
    },
    required: true,
    default: { en: '', am: '' },
  })
  content: {
    en: string;
    am: string;
  };
}

export const ContentBlockSchema = SchemaFactory.createForClass(ContentBlock);
