import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClassDocument = Class & Document;

@Schema({ timestamps: true })
export class Class {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  instructorId: Types.ObjectId;

  @Prop({
    type: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  materials: { title: string; url: string; uploadedAt: Date }[];

  @Prop({ default: false })
  isLive: boolean;

  @Prop()
  liveRoomCode?: string;
}

export const ClassSchema = SchemaFactory.createForClass(Class);

