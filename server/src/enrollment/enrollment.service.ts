import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Enrollment, EnrollmentDocument } from './schemas/enrollment.schema';

export type CreateEnrollmentDto = {
  classId: string;
  studentId: string;
  status?: 'active' | 'pending' | 'withdrawn';
  amountPaid?: number;
  currency?: string;
  paymentMethod?: string;
  paymentReference?: string;
  note?: string;
  fullName?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  occupation?: string;
  city?: string;
  address?: string;
  preferredDaysPerWeek?: number;
  preferredSchedule?: string;
  learningGoals?: string;
  notesForTeacher?: string;
  receiptUrl?: string;
  learningType?: 'physical' | 'online';
  branchId?: string;
  instrumentType?: string;
  programDurationMonths?: 3 | 6 | 9;
  preferredLearningDays?: string[];
  preferredTime?: string;
  timeSlots?: { day: string; startTime: string }[];
  registrationStartDate?: Date;
};

export type UpdateEnrollmentStatusDto = {
  status: 'active' | 'pending' | 'withdrawn';
  note?: string;
};

/** Partial update for re-enrollment (same class/student, new payment details). */
export type UpdateEnrollmentDto = Partial<Omit<CreateEnrollmentDto, 'classId' | 'studentId'>>;

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<EnrollmentDocument>,
  ) {}

  async create(dto: CreateEnrollmentDto) {
    if (!Types.ObjectId.isValid(dto.classId) || !Types.ObjectId.isValid(dto.studentId)) {
      throw new BadRequestException('Invalid classId or studentId');
    }
    const existing = await this.enrollmentModel
      .findOne({
        classId: new Types.ObjectId(dto.classId),
        studentId: new Types.ObjectId(dto.studentId),
      })
      .lean()
      .exec();
    if (existing) {
      throw new BadRequestException('Student is already enrolled in this class');
    }
    const doc: Record<string, unknown> = {
      classId: new Types.ObjectId(dto.classId),
      studentId: new Types.ObjectId(dto.studentId),
      status: dto.status ?? 'pending',
      enrolledAt: new Date(),
    };
    if (dto.amountPaid != null) doc.amountPaid = dto.amountPaid;
    if (dto.currency) doc.currency = dto.currency;
    if (dto.paymentMethod) doc.paymentMethod = dto.paymentMethod;
    if (dto.paymentReference) doc.paymentReference = dto.paymentReference;
    if (dto.note) doc.note = dto.note;
    if (dto.fullName) doc.fullName = dto.fullName;
    if (dto.phone) doc.phone = dto.phone;
    if (dto.emergencyContactName) doc.emergencyContactName = dto.emergencyContactName;
    if (dto.emergencyContactPhone) doc.emergencyContactPhone = dto.emergencyContactPhone;
    if (dto.occupation) doc.occupation = dto.occupation;
    if (dto.city) doc.city = dto.city;
    if (dto.address) doc.address = dto.address;
    if (dto.preferredDaysPerWeek != null) doc.preferredDaysPerWeek = dto.preferredDaysPerWeek;
    if (dto.preferredSchedule) doc.preferredSchedule = dto.preferredSchedule;
    if (dto.learningGoals) doc.learningGoals = dto.learningGoals;
    if (dto.notesForTeacher) doc.notesForTeacher = dto.notesForTeacher;
    if (dto.receiptUrl) doc.receiptUrl = dto.receiptUrl;
    if (dto.learningType) doc.learningType = dto.learningType;
    if (dto.branchId) doc.branchId = new Types.ObjectId(dto.branchId);
    if (dto.instrumentType) doc.instrumentType = dto.instrumentType;
    if (dto.programDurationMonths != null) doc.programDurationMonths = dto.programDurationMonths;
    if (dto.preferredLearningDays?.length) doc.preferredLearningDays = dto.preferredLearningDays;
    if (dto.preferredTime) doc.preferredTime = dto.preferredTime;
    if (dto.timeSlots) doc.timeSlots = dto.timeSlots;
    if (dto.registrationStartDate) doc.registrationStartDate = new Date(dto.registrationStartDate);
    const created = await this.enrollmentModel.create(doc);
    return created.toObject();
  }

  async findByClass(classId: string) {
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid classId');
    }
    return this.enrollmentModel
      .find({ classId: new Types.ObjectId(classId) })
      .sort({ enrolledAt: -1 })
      .populate('studentId', 'firstName lastName email avatarUrl')
      .populate('approvedBy', 'firstName lastName email')
      .lean()
      .exec();
  }

  async findByStudent(studentId: string) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid studentId');
    }
    return this.enrollmentModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .sort({ enrolledAt: -1 })
      .populate('classId', 'title startDate endDate tuition currency instrumentType level enrollmentDeadline')
      .lean()
      .exec();
  }

  /** Find all enrollments with optional status and branch filter (for admin list). */
  async findAll(
    status?: 'active' | 'pending' | 'withdrawn',
    branchFilter?: { branchId: string },
  ) {
    const filter: Record<string, unknown> = typeof status === 'string' ? { status } : {};
    if (branchFilter?.branchId && Types.ObjectId.isValid(branchFilter.branchId)) {
      filter.branchId = new Types.ObjectId(branchFilter.branchId);
    }
    return this.enrollmentModel
      .find(filter)
      .sort({ enrolledAt: -1 })
      .populate({
        path: 'classId',
        select: 'title currency tuition instructorId',
        populate: { path: 'instructorId', select: 'firstName lastName email' },
      })
      .populate('studentId', 'firstName lastName email')
      .lean()
      .exec();
  }

  async findOne(classId: string, studentId: string) {
    if (!Types.ObjectId.isValid(classId) || !Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid classId or studentId');
    }
    return this.enrollmentModel
      .findOne({
        classId: new Types.ObjectId(classId),
        studentId: new Types.ObjectId(studentId),
      })
      .populate('studentId', 'firstName lastName email avatarUrl')
      .lean()
      .exec();
  }

  async updateStatus(
    classId: string,
    studentId: string,
    dto: UpdateEnrollmentStatusDto,
    approverId: string,
  ) {
    const enrollment = await this.enrollmentModel
      .findOne({
        classId: new Types.ObjectId(classId),
        studentId: new Types.ObjectId(studentId),
      })
      .exec();
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    enrollment.status = dto.status;
    if (dto.note !== undefined) enrollment.note = dto.note;
    enrollment.approvedBy = new Types.ObjectId(approverId);
    enrollment.approvedAt = new Date();
    await enrollment.save();
    return enrollment.toObject();
  }

  /** Update enrollment fields (e.g. re-enrollment with new payment info). */
  async update(
    classId: string,
    studentId: string,
    dto: UpdateEnrollmentDto,
  ) {
    const enrollment = await this.enrollmentModel
      .findOne({
        classId: new Types.ObjectId(classId),
        studentId: new Types.ObjectId(studentId),
      })
      .exec();
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    if (dto.status !== undefined) enrollment.status = dto.status;
    if (dto.amountPaid != null) enrollment.amountPaid = dto.amountPaid;
    if (dto.currency !== undefined) enrollment.currency = dto.currency;
    if (dto.paymentMethod !== undefined) enrollment.paymentMethod = dto.paymentMethod;
    if (dto.paymentReference !== undefined) enrollment.paymentReference = dto.paymentReference;
    if (dto.note !== undefined) enrollment.note = dto.note;
    if (dto.fullName !== undefined) enrollment.fullName = dto.fullName;
    if (dto.phone !== undefined) enrollment.phone = dto.phone;
    if (dto.emergencyContactName !== undefined) enrollment.emergencyContactName = dto.emergencyContactName;
    if (dto.emergencyContactPhone !== undefined) enrollment.emergencyContactPhone = dto.emergencyContactPhone;
    if (dto.occupation !== undefined) enrollment.occupation = dto.occupation;
    if (dto.city !== undefined) enrollment.city = dto.city;
    if (dto.address !== undefined) enrollment.address = dto.address;
    if (dto.preferredDaysPerWeek !== undefined) enrollment.preferredDaysPerWeek = dto.preferredDaysPerWeek;
    if (dto.preferredSchedule !== undefined) enrollment.preferredSchedule = dto.preferredSchedule;
    if (dto.learningGoals !== undefined) enrollment.learningGoals = dto.learningGoals;
    if (dto.notesForTeacher !== undefined) enrollment.notesForTeacher = dto.notesForTeacher;
    if (dto.receiptUrl !== undefined) enrollment.receiptUrl = dto.receiptUrl;
    if (dto.learningType !== undefined) enrollment.learningType = dto.learningType;
    if (dto.branchId !== undefined) enrollment.branchId = dto.branchId ? new Types.ObjectId(dto.branchId) : undefined;
    if (dto.instrumentType !== undefined) enrollment.instrumentType = dto.instrumentType;
    if (dto.programDurationMonths !== undefined) enrollment.programDurationMonths = dto.programDurationMonths;
    if (dto.preferredLearningDays !== undefined) enrollment.preferredLearningDays = dto.preferredLearningDays;
    if (dto.preferredTime !== undefined) enrollment.preferredTime = dto.preferredTime;
    if (dto.timeSlots !== undefined) enrollment.timeSlots = dto.timeSlots;
    if (dto.registrationStartDate !== undefined) enrollment.registrationStartDate = dto.registrationStartDate ? new Date(dto.registrationStartDate) : undefined;
    await enrollment.save();
    return enrollment.toObject();
  }

  /** Count non-withdrawn enrollments for a class (for capacity checks). */
  async countActiveByClass(classId: string): Promise<number> {
    return this.enrollmentModel
      .countDocuments({
        classId: new Types.ObjectId(classId),
        status: { $ne: 'withdrawn' },
      })
      .exec();
  }

  /** Counts by classId for multiple classes. Returns Map<classIdStr, count>. */
  async countActiveByClassIds(classIds: Types.ObjectId[]): Promise<Map<string, number>> {
    if (classIds.length === 0) return new Map();
    const agg = await this.enrollmentModel
      .aggregate<{ _id: Types.ObjectId; count: number }>()
      .match({
        classId: { $in: classIds },
        status: { $ne: 'withdrawn' },
      })
      .group({ _id: '$classId', count: { $sum: 1 } })
      .exec();
    const map = new Map<string, number>();
    for (const row of agg) {
      map.set(row._id.toString(), row.count);
    }
    return map;
  }

}
