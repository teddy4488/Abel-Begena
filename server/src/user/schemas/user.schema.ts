import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export type UserRole = 'User' | 'Teacher' | 'Admin';

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ trim: true })
  firstName?: string;

  @Prop({ trim: true })
  lastName?: string;

  @Prop({ unique: true, sparse: true, trim: true })
  phone?: string;

  @Prop({
    required: true,
    enum: ['User', 'Teacher', 'Admin'],
    default: 'User',
  })
  role: UserRole;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ type: String, required: false, default: null })
  verificationCode?: string;

  @Prop({ type: Date, required: false, default: null })
  verificationCodeExpiresAt?: Date;

  @Prop({
    enum: ['pending', 'approved', 'suspended'],
  })
  teacherStatus?: 'pending' | 'approved' | 'suspended';

  @Prop()
  avatarUrl?: string;

  @Prop({ trim: true })
  bio?: string;

  @Prop({ enum: ['en', 'am'], default: 'en' })
  languagePreference?: 'en' | 'am';

  @Prop({ type: String, required: false, default: null })
  passwordResetCode?: string;

  @Prop({ type: Date, required: false, default: null })
  passwordResetCodeExpiresAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
