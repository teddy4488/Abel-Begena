import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InstrumentType } from '../../product/schemas/product.schema';

export type ClassDocument = Class & Document;

@Schema({ _id: false })
export class ClassEnrollment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  student: Types.ObjectId;

  @Prop({ default: Date.now })
  enrolledAt: Date;

  @Prop({
    type: String,
    enum: ['active', 'pending', 'withdrawn'],
    default: 'active',
  })
  status: 'active' | 'pending' | 'withdrawn';

  @Prop({ type: Number, min: 0 })
  amountPaid?: number;

  @Prop({ trim: true, maxlength: 12 })
  currency?: string;

  @Prop({
    trim: true,
    maxlength: 40,
    enum: ['Chapa', 'Telebirr', 'Stripe', 'BankTransfer', 'Manual', 'Other'],
  })
  paymentMethod?: string;

  @Prop({ trim: true, maxlength: 120 })
  paymentReference?: string;

  @Prop({ trim: true, maxlength: 400 })
  note?: string;

  // Optional intake profile + payment receipt
  @Prop({ trim: true, maxlength: 160 })
  fullName?: string;

  @Prop({ trim: true, maxlength: 40 })
  phone?: string;

  @Prop({ trim: true, maxlength: 120 })
  emergencyContactName?: string;

  @Prop({ trim: true, maxlength: 40 })
  emergencyContactPhone?: string;

  @Prop({ trim: true, maxlength: 120 })
  occupation?: string;

  @Prop({ trim: true, maxlength: 120 })
  city?: string;

  @Prop({ trim: true, maxlength: 240 })
  address?: string;

  @Prop({ min: 1 })
  preferredDaysPerWeek?: number;

  @Prop({ trim: true, maxlength: 240 })
  preferredSchedule?: string;

  @Prop({ trim: true, maxlength: 240 })
  learningGoals?: string;

  @Prop({ trim: true, maxlength: 400 })
  notesForTeacher?: string;

  @Prop({ trim: true, maxlength: 400 })
  receiptUrl?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  // Student conversion fields (for migrating user to student upon approval)
  @Prop({ type: String, enum: ['physical', 'online'] })
  learningType?: 'physical' | 'online';

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ trim: true, maxlength: 40 })
  instrumentType?: string;

  @Prop({ type: Number, enum: [3, 6, 9] })
  programDurationMonths?: 3 | 6 | 9;

  @Prop({
    type: [String],
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  })
  preferredLearningDays?: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>;

  /** Preferred time of learning (e.g. "12:00 PM LT") */
  @Prop({ trim: true, maxlength: 40 })
  preferredTime?: string;

  @Prop({ type: Date })
  registrationStartDate?: Date;
}

export const ClassEnrollmentSchema =
  SchemaFactory.createForClass(ClassEnrollment);

@Schema()
export class ClassSession {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 160 })
  title: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime?: Date;

  @Prop({ trim: true, maxlength: 160 })
  location?: string;

  @Prop({ trim: true, maxlength: 800 })
  notes?: string;
}

export const ClassSessionSchema = SchemaFactory.createForClass(ClassSession);

@Schema({ timestamps: true })
export class Class {
  @Prop({ required: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(InstrumentType),
    required: true,
    index: true,
  })
  instrumentType: InstrumentType;

  @Prop({
    type: String,
    enum: ['beginner', 'advanced'],
    default: 'beginner',
    index: true,
  })
  level: 'beginner' | 'advanced';

  // Physical cohorts can be tied to a branch
  @Prop({ type: Types.ObjectId, ref: 'Branch', index: true })
  branchId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['online', 'physical', 'both'],
    default: 'online',
  })
  classType?: 'online' | 'physical' | 'both';

  @Prop({ type: Types.ObjectId, ref: 'Teacher' })
  instructorId?: Types.ObjectId;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({ min: 0 })
  capacity?: number;

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

  @Prop({ type: [ClassEnrollmentSchema], default: [] })
  enrollments: ClassEnrollment[];

  @Prop({ type: [ClassSessionSchema], default: [] })
  schedule: ClassSession[];

  @Prop({ min: 0 })
  tuition?: number;

  @Prop({ trim: true, maxlength: 12, default: 'ETB' })
  currency?: string;

  @Prop()
  enrollmentDeadline?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ClassSchema = SchemaFactory.createForClass(Class);
