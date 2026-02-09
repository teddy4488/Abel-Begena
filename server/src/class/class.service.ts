import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  Class,
  ClassDocument,
  ClassSession,
} from './schemas/class.schema';
import {
  UploadService,
  ALLOWED_RECEIPT_MIMES,
  ALLOWED_RECEIPT_EXTENSIONS,
  MAX_RECEIPT_SIZE_BYTES,
} from '../upload/upload.service';
import { UpdateLiveStateDto } from './dto/update-live-state.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CreateScheduleItemDto } from './dto/create-schedule-item.dto';
import { UpdateScheduleItemDto } from './dto/update-schedule-item.dto';
import { EnrollClassDto, ClassPaymentMethod } from './dto/enroll-class.dto';
import { PaymentService } from '../payment/payment.service';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';
import { EnrollmentService } from '../enrollment/enrollment.service';

type AuthenticatedUser = {
  sub: string;
  role?: string;
  branchId?: string;
};

@Injectable()
export class ClassService {
  constructor(
    @InjectModel(Class.name)
    private readonly classModel: Model<ClassDocument>,
    private readonly configService: ConfigService,
    private readonly uploadService: UploadService,
    private readonly paymentService: PaymentService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  async findForUser(user: AuthenticatedUser) {
    const userId = user.sub;
    const role = user.role;

    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }

    const notDeleted = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
    const branchFilter = user.branchId ? { branchId: new Types.ObjectId(user.branchId) } : {};
    if (role === 'Admin') {
      const classes = await this.classModel
        .find({ ...notDeleted, ...branchFilter })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      const classIds = classes.map((c) => (c as { _id: Types.ObjectId })._id);
      const countMap = await this.enrollmentService.countActiveByClassIds(classIds);
      return this.mapClassSummariesFromEnrollments(classes, userId, [], countMap);
    }

    if (role === 'Teacher') {
      const teacherObjectId = new Types.ObjectId(userId);
      const classes = await this.classModel
        .find({
          ...notDeleted,
          $or: [
            { instructorId: teacherObjectId },
            { primaryInstructorId: teacherObjectId },
            { teacherIds: teacherObjectId },
          ],
        })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      const classIds = classes.map((c) => (c as { _id: Types.ObjectId })._id);
      const countMap = await this.enrollmentService.countActiveByClassIds(classIds);
      return this.mapClassSummariesFromEnrollments(classes, userId, [], countMap);
    }

    // Phase 5.2: enrollments in separate collection
    const enrollments = await this.enrollmentService.findByStudent(userId);
    const activeEnrollments = enrollments.filter((e: { status?: string }) => e.status !== 'withdrawn');
    const classIds = activeEnrollments
      .map((e: { classId?: { _id?: Types.ObjectId } | Types.ObjectId }) =>
        typeof e.classId === 'object' && e.classId && '_id' in e.classId
          ? (e.classId as { _id: Types.ObjectId })._id
          : e.classId,
      )
      .filter(Boolean);
    if (classIds.length === 0) return [];
    const classes = await this.classModel
      .find({ _id: { $in: classIds }, ...notDeleted })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const countMap = await this.enrollmentService.countActiveByClassIds(
      classes.map((c) => (c as { _id: Types.ObjectId })._id),
    );
    return this.mapClassSummariesFromEnrollments(classes, userId, activeEnrollments, countMap);
  }

  async getManagedCatalog(branchId?: string) {
    const notDeleted = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
    const branchFilter = branchId && Types.ObjectId.isValid(branchId) ? { branchId: new Types.ObjectId(branchId) } : {};
    const classes = await this.classModel
      .find({ ...notDeleted, ...branchFilter })
      .populate('instructorId', 'firstName lastName email avatarUrl')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const classIds = classes.map((c) => (c as { _id: Types.ObjectId })._id);
    const countMap = await this.enrollmentService.countActiveByClassIds(classIds);
    return classes.map((klass) => ({
      ...klass,
      enrollmentCount: countMap.get((klass as { _id: Types.ObjectId })._id.toString()) ?? 0,
    }));
  }

  async createClass(dto: CreateClassDto) {
    const payload: Partial<Class> = {
      title: dto.title,
      description: dto.description,
      instrumentType: dto.instrumentType,
      level: dto.level ?? 'beginner',
    };

    if (dto.classType) {
      payload.classType = dto.classType;
    }

    if (dto.branchId) {
      if (!Types.ObjectId.isValid(dto.branchId)) {
        throw new BadRequestException('Invalid branchId');
      }
      (payload as any).branchId = new Types.ObjectId(dto.branchId);
    }

    if (dto.instructorId) {
      if (!Types.ObjectId.isValid(dto.instructorId)) {
        throw new BadRequestException('Invalid instructor id');
      }
      const instructorObjectId = new Types.ObjectId(dto.instructorId);
      payload.instructorId = instructorObjectId;
      // Ensure the lead instructor is also included in teacherIds for multi-teacher support
      (payload as any).teacherIds = [instructorObjectId];
      (payload as any).primaryInstructorId = instructorObjectId;
    }

    if (dto.teacherIds?.length) {
      const validTeacherIds: Types.ObjectId[] = [];
      for (const id of dto.teacherIds) {
        if (!Types.ObjectId.isValid(id)) {
          throw new BadRequestException('Invalid teacher id in teacherIds');
        }
        validTeacherIds.push(new Types.ObjectId(id));
      }
      (payload as any).teacherIds = validTeacherIds;
      // If no primaryInstructorId was provided, default to the first teacher
      if (!dto.primaryInstructorId && !dto.instructorId && validTeacherIds.length > 0) {
        (payload as any).primaryInstructorId = validTeacherIds[0];
        payload.instructorId = validTeacherIds[0];
      }
    }

    if (dto.primaryInstructorId) {
      if (!Types.ObjectId.isValid(dto.primaryInstructorId)) {
        throw new BadRequestException('Invalid primary instructor id');
      }
      const primary = new Types.ObjectId(dto.primaryInstructorId);
      (payload as any).primaryInstructorId = primary;
      // Keep legacy instructorId in sync where possible
      payload.instructorId = primary;
      // Ensure primary instructor is part of teacherIds
      const existingTeachers: Types.ObjectId[] = ((payload as any).teacherIds as Types.ObjectId[]) ?? [];
      if (!existingTeachers.some((id) => id.equals(primary))) {
        (payload as any).teacherIds = [...existingTeachers, primary];
      }
    }

    if (dto.startDate) {
      payload.startDate = new Date(dto.startDate);
    }

    if (dto.endDate) {
      payload.endDate = new Date(dto.endDate);
    }

    if (typeof dto.tuition === 'number') {
      payload.tuition = dto.tuition;
    }

    if (dto.currency) {
      payload.currency = dto.currency.toUpperCase();
    }

    if (dto.enrollmentDeadline) {
      payload.enrollmentDeadline = new Date(dto.enrollmentDeadline);
    }

    const created = await this.classModel.create(payload);
    return created.toObject();
  }

  async updateClass(id: string, dto: UpdateClassDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class id');
    }

    const update: Partial<Class> = {
      ...(dto.title ? { title: dto.title } : {}),
      ...(dto.description ? { description: dto.description } : {}),
    };

    if (dto.instrumentType) {
      update.instrumentType = dto.instrumentType;
    }

    if (dto.level) {
      update.level = dto.level;
    }

    if (dto.classType) {
      update.classType = dto.classType;
    }

    if (dto.branchId !== undefined) {
      if (!dto.branchId) {
        (update as any).branchId = undefined;
      } else {
        if (!Types.ObjectId.isValid(dto.branchId)) {
          throw new BadRequestException('Invalid branchId');
        }
        (update as any).branchId = new Types.ObjectId(dto.branchId);
      }
    }

    if (dto.startDate) {
      update.startDate = new Date(dto.startDate);
    }

    if (dto.endDate) {
      update.endDate = new Date(dto.endDate);
    }

    if (typeof dto.tuition === 'number') {
      update.tuition = dto.tuition;
    }

    if (typeof dto.currency === 'string') {
      update.currency = dto.currency.toUpperCase();
    }

    if (dto.enrollmentDeadline) {
      update.enrollmentDeadline = new Date(dto.enrollmentDeadline);
    }

    if (dto.instructorId) {
      if (!Types.ObjectId.isValid(dto.instructorId)) {
        throw new BadRequestException('Invalid instructor id');
      }
      const instructorObjectId = new Types.ObjectId(dto.instructorId);
      update.instructorId = instructorObjectId;
      // Keep teacherIds/primaryInstructorId aligned with new instructor when explicitly set
      (update as any).primaryInstructorId = instructorObjectId;
      (update as any).teacherIds = [instructorObjectId];
    }

    if (dto.teacherIds) {
      const teacherIds: Types.ObjectId[] = [];
      for (const id of dto.teacherIds) {
        if (!Types.ObjectId.isValid(id)) {
          throw new BadRequestException('Invalid teacher id in teacherIds');
        }
        teacherIds.push(new Types.ObjectId(id));
      }
      (update as any).teacherIds = teacherIds;
    }

    if (dto.primaryInstructorId) {
      if (!Types.ObjectId.isValid(dto.primaryInstructorId)) {
        throw new BadRequestException('Invalid primary instructor id');
      }
      const primary = new Types.ObjectId(dto.primaryInstructorId);
      (update as any).primaryInstructorId = primary;
      // Keep legacy instructorId in sync if not explicitly overridden
      if (!dto.instructorId) {
        (update as any).instructorId = primary;
      }
    }

    const updated = await this.classModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('instructorId', 'firstName lastName email avatarUrl')
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Class not found');
    }

    return updated;
  }

  async removeClass(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class id');
    }
    const notDeleted = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
    const updated = await this.classModel
      .findOneAndUpdate(
        { _id: id, ...notDeleted },
        { deletedAt: new Date() },
        { new: true },
      )
      .lean()
      .exec();
    if (!updated) {
      throw new NotFoundException('Class not found');
    }
    return { message: 'Class removed' };
  }

  async getPublicCatalog(
    limit = 6,
    instrumentType?: string,
    level?: 'beginner' | 'advanced',
  ) {
    const filter: Record<string, unknown> = {};
    if (instrumentType) {
      filter.instrumentType = instrumentType;
    }
    if (level) {
      filter.level = level;
    }

    const classes = await this.classModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        'title description startDate endDate tuition currency enrollmentDeadline instructorId instrumentType level classType',
      )
      .populate('instructorId', 'firstName lastName')
      .lean()
      .exec();
    const classIds = classes.map((c) => (c as { _id: Types.ObjectId })._id);
    const countMap = await this.enrollmentService.countActiveByClassIds(classIds);

    return classes.map((klass) => {
      const enrollmentCount = countMap.get((klass as { _id: Types.ObjectId })._id.toString()) ?? 0;
      const instructor = klass.instructorId as
        | { firstName?: string; lastName?: string }
        | undefined;
      const instructorName = instructor
        ? `${instructor.firstName ?? ''} ${instructor.lastName ?? ''}`.trim() ||
          null
        : null;
      const enrollmentDeadline =
        klass.enrollmentDeadline instanceof Date
          ? klass.enrollmentDeadline.toISOString()
          : null;
      const createdAt =
        klass.createdAt instanceof Date ? klass.createdAt.toISOString() : null;

      return {
        _id: klass._id?.toString(),
        title: klass.title,
        description: klass.description ?? null,
        tuition: klass.tuition ?? 0,
        currency: klass.currency ?? 'ETB',
        enrollmentDeadline,
        enrollmentCount,
        instructorName,
        createdAt,
        instrumentType: (klass as any).instrumentType,
        level: (klass as any).level ?? 'beginner',
        classType: (klass as any).classType ?? 'online',
      };
    });
  }

  findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    return this.classModel.findById(id).exec();
  }

  async getAccessPayload(id: string, user: AuthenticatedUser) {
    const classEntity = await this.classModel.findById(id).lean().exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const userId = user.sub;
    const isAdmin = user.role === 'Admin';
    const isInstructor =
      user.role === 'Teacher' &&
      classEntity.instructorId?.toString() === userId;
    const enrollment = await this.enrollmentService.findOne(
      (classEntity as { _id: Types.ObjectId })._id.toString(),
      userId,
    );
    const isEnrolled = enrollment?.status === 'active';

    if (!isAdmin && !isInstructor && !isEnrolled) {
      throw new ForbiddenException('You are not enrolled in this class');
    }

    // Handle live link: if it's an external URL (http/https), return as-is
    // Otherwise, construct built-in platform URL
    let liveLink: string | null = null;
    if (classEntity.liveRoomCode) {
      if (
        classEntity.liveRoomCode.startsWith('http://') ||
        classEntity.liveRoomCode.startsWith('https://')
      ) {
        // External link (Zoom, Google Meet, etc.)
        liveLink = classEntity.liveRoomCode;
      } else if (classEntity.liveRoomCode === 'builtin') {
        // Built-in platform - construct URL
    const baseUrl =
      this.configService.get<string>('MEETING_PROVIDER_BASE_URL') ?? '';
    const sanitizedBase = baseUrl.endsWith('/')
      ? baseUrl.slice(0, -1)
      : baseUrl;
        liveLink = sanitizedBase
          ? `${sanitizedBase}/${String(classEntity._id)}`
          : null;
      } else {
        // Legacy: treat as room code
        const baseUrl =
          this.configService.get<string>('MEETING_PROVIDER_BASE_URL') ?? '';
        const sanitizedBase = baseUrl.endsWith('/')
          ? baseUrl.slice(0, -1)
          : baseUrl;
        liveLink = sanitizedBase
          ? `${sanitizedBase}/${classEntity.liveRoomCode}`
          : null;
      }
    }

    return {
      // materials are now provided by InstrumentMaterial collection; this field is kept
      // for backward compatibility and will be removed once all clients migrate.
      materials: classEntity.materials ?? [],
      isLive: classEntity.isLive ?? false,
      liveLink,
      class: {
        _id: classEntity._id,
        title: classEntity.title,
      },
    };
  }

  async appendMaterial(
    classId: string,
    file: Express.Multer.File,
    title: string,
  ) {
    const classEntity = await this.classModel.findById(classId).exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const url = await this.uploadService.uploadMaterial(file, undefined, {
      allowedMimeTypes: [...ALLOWED_RECEIPT_MIMES],
      allowedExtensions: [...ALLOWED_RECEIPT_EXTENSIONS],
      maxSizeBytes: MAX_RECEIPT_SIZE_BYTES,
    });

    classEntity.materials = classEntity.materials ?? [];

    classEntity.materials.push({
      title: title || file.originalname,
      url,
      uploadedAt: new Date(),
    });

    await classEntity.save();

    return classEntity;
  }

  async enrollStudent(
    classId: string,
    studentId: string,
    dto: EnrollClassDto,
    options?: { statusOverride?: 'active' | 'pending' },
  ) {
    this.ensureValidClassId(classId);
    const classEntity = await this.classModel.findById(classId).exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student id');
    }

    if (
      classEntity.enrollmentDeadline &&
      classEntity.enrollmentDeadline.getTime() < Date.now()
    ) {
      throw new BadRequestException('Enrollment period has ended');
    }

    const existing = await this.enrollmentService.findOne(classId, studentId);

    if (
      typeof classEntity.tuition === 'number' &&
      classEntity.tuition > 0 &&
      dto.amount < classEntity.tuition
    ) {
      throw new BadRequestException(
        'Amount paid is less than the required tuition',
      );
    }

    const currency =
      dto.currency?.toUpperCase() ?? classEntity.currency ?? 'ETB';

    const requiresVerification =
      typeof classEntity.tuition === 'number' && classEntity.tuition > 0;

    const enrollmentStatus: 'active' | 'pending' =
      options?.statusOverride ?? (requiresVerification ? 'pending' : 'active');

    if (
      requiresVerification &&
      enrollmentStatus === 'pending' &&
      !dto.receiptUrl &&
      (!dto.paymentReference || !dto.paymentReference.trim())
    ) {
      throw new BadRequestException(
        'Payment reference is required when no receipt is uploaded',
      );
    }

    if (
      requiresVerification &&
      enrollmentStatus === 'pending' &&
      !dto.receiptUrl
    ) {
      await this.paymentService.create(
        {
          type: 'enrollment',
          targetId: classId,
          amount: dto.amount,
          currency,
          method: dto.paymentMethod ?? ClassPaymentMethod.BANK,
          reference: dto.paymentReference?.trim(),
          receiptUrl: undefined,
          reviewNote: dto.note,
        },
        studentId,
      );
    }

    const registrationStartDate = dto.registrationStartDate
      ? new Date(dto.registrationStartDate)
      : undefined;
    const createDto = {
      classId,
      studentId,
      status: enrollmentStatus,
      amountPaid: dto.amount,
      currency,
      paymentMethod: dto.paymentMethod ?? ClassPaymentMethod.MANUAL,
      paymentReference: dto.paymentReference?.trim(),
      note: dto.note,
      fullName: dto.fullName,
      phone: dto.phone,
      emergencyContactName: dto.emergencyContactName,
      emergencyContactPhone: dto.emergencyContactPhone,
      occupation: dto.occupation,
      city: dto.city,
      address: dto.address,
      preferredDaysPerWeek: dto.preferredDaysPerWeek,
      preferredSchedule: dto.preferredSchedule,
      preferredTime: dto.preferredTime,
      learningGoals: dto.learningGoals,
      notesForTeacher: dto.notesForTeacher,
      receiptUrl: dto.receiptUrl,
      learningType: dto.learningType,
      branchId: dto.branchId,
      instrumentType: dto.instrumentType,
      programDurationMonths: dto.programDurationMonths,
      preferredLearningDays: dto.preferredLearningDays,
      registrationStartDate,
    };
    const enrollmentRecord = existing
      ? await this.enrollmentService.update(classId, studentId, (() => {
          const { classId: _cid, studentId: _sid, ...rest } = createDto;
          return rest;
        })())
      : await this.enrollmentService.create(createDto);

    return {
      message: 'Enrollment recorded',
      enrollment: this.mapEnrollmentResponse(enrollmentRecord, classEntity),
    };
  }

  async enrollStudentWithReceipt(
    classId: string,
    studentId: string,
    dto: EnrollClassDto,
    file: Express.Multer.File,
  ) {
    const receiptUrl = await this.uploadService.uploadMaterial(
      file,
      'abel-begena/payment-receipts',
      {
        allowedMimeTypes: [...ALLOWED_RECEIPT_MIMES],
        allowedExtensions: [...ALLOWED_RECEIPT_EXTENSIONS],
        maxSizeBytes: MAX_RECEIPT_SIZE_BYTES,
      },
    );
    const enrichedDto: EnrollClassDto = {
      ...dto,
      receiptUrl,
    };

    // Build conversion data if the user provided student conversion fields
    let conversionData: string | undefined;
    if (
      dto.learningType &&
      dto.instrumentType &&
      dto.programDurationMonths &&
      dto.preferredLearningDays &&
      dto.fullName
    ) {
      const conversionPayload = {
        fullName: dto.fullName,
        learningType: dto.learningType,
        branchId: dto.branchId,
        instrumentType: dto.instrumentType,
        programDurationMonths: dto.programDurationMonths,
        preferredLearningDays: dto.preferredLearningDays,
        registrationStartDate: dto.registrationStartDate ?? new Date().toISOString(),
        phone: dto.phone,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        occupation: dto.occupation,
        city: dto.city,
        address: dto.address,
        preferredSchedule: dto.preferredSchedule,
        preferredTime: dto.preferredTime,
        amount: dto.amount,
        currency: dto.currency ?? 'ETB',
        paymentMethod: dto.paymentMethod ?? ClassPaymentMethod.BANK,
        paymentReference: dto.paymentReference,
        note: dto.note,
      };
      conversionData = JSON.stringify(conversionPayload);
    }

    // Create a pending payment request for admin verification
    await this.paymentService.create(
      {
        type: 'enrollment',
        targetId: classId,
        amount: enrichedDto.amount,
        currency: enrichedDto.currency ?? 'ETB',
        method: enrichedDto.paymentMethod ?? ClassPaymentMethod.BANK,
        reference: enrichedDto.paymentReference?.trim(),
        receiptUrl,
        reviewNote: enrichedDto.note,
        conversionData,
      },
      studentId,
    );

    // Store enrollment as pending until payment is approved by admin
    return this.enrollStudent(classId, studentId, enrichedDto, {
      statusOverride: 'pending',
    });
  }

  async updateLiveState(id: string, dto: UpdateLiveStateDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Class not found');
    }

    const updatePayload: Partial<Class> = {};

    if (typeof dto.isLive === 'boolean') {
      updatePayload.isLive = dto.isLive;
    }

    if (typeof dto.liveRoomCode !== 'undefined') {
      updatePayload.liveRoomCode = dto.liveRoomCode || undefined;
    }

    const updated = await this.classModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .select('title isLive liveRoomCode materials instructorId createdAt')
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Class not found');
    }

    return updated;
  }

  async getEnrollmentDetail(classId: string, studentId: string) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student id');
    }
    const classEntity = await this.classModel.findById(classId).lean().exec();
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }
    const enrollment = await this.enrollmentService.findOne(classId, studentId);
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    return this.mapEnrollmentResponse(enrollment, classEntity as Class & { _id: Types.ObjectId });
  }

  async getStudentEnrollments(studentId: string) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student id');
    }
    const enrollments = await this.enrollmentService.findByStudent(studentId);
    const entries = enrollments.map((enrollment) => {
      const klass = enrollment.classId as { _id?: Types.ObjectId; title?: string; startDate?: Date; endDate?: Date; tuition?: number; currency?: string; enrollmentDeadline?: Date } | undefined;
      return {
        ...this.mapEnrollmentResponse(
          enrollment,
          klass ? { _id: klass._id, currency: klass.currency } as Class & { _id: Types.ObjectId } : undefined,
        ),
        startDate: klass?.startDate ? new Date(klass.startDate).toISOString() : null,
        endDate: klass?.endDate ? new Date(klass.endDate).toISOString() : null,
        enrollmentDeadline: klass?.enrollmentDeadline
          ? new Date(klass.enrollmentDeadline).toISOString()
          : null,
        tuition: klass?.tuition ?? 0,
      };
    });
    return entries.sort((a, b) => {
      const aTime = a.enrolledAt ? new Date(a.enrolledAt).getTime() : 0;
      const bTime = b.enrolledAt ? new Date(b.enrolledAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  async getAllEnrollments(
    status?: 'active' | 'pending' | 'withdrawn',
    branchFilter?: { branchId: string },
  ) {
    const enrollments = await this.enrollmentService.findAll(status, branchFilter);
    const instructorLabel = (obj: { firstName?: string; lastName?: string } | null | undefined): string | null =>
      obj ? `${obj.firstName ?? ''} ${obj.lastName ?? ''}`.trim() || null : null;

    const rows = enrollments.map((enrollment) => {
      const classDoc = enrollment.classId as { _id?: Types.ObjectId; title?: string; currency?: string; instructorId?: { firstName?: string; lastName?: string; email?: string } } | undefined;
      const studentDoc = enrollment.studentId as { _id?: Types.ObjectId; firstName?: string; lastName?: string; email?: string } | undefined;
      return {
        classId: classDoc?._id?.toString?.() ?? '',
        classTitle: classDoc?.title ?? '',
        instructor: instructorLabel(classDoc?.instructorId as { firstName?: string; lastName?: string }),
        student: {
          id: studentDoc?._id?.toString?.() ?? '',
          firstName: studentDoc?.firstName ?? null,
          lastName: studentDoc?.lastName ?? null,
          email: studentDoc?.email ?? '',
        },
        status: enrollment.status,
        amountPaid: enrollment.amountPaid ?? null,
        currency: enrollment.currency ?? classDoc?.currency ?? 'ETB',
        paymentMethod: enrollment.paymentMethod ?? null,
        paymentReference: enrollment.paymentReference ?? null,
        note: enrollment.note ?? null,
        enrolledAt: enrollment.enrolledAt
          ? new Date(enrollment.enrolledAt).toISOString()
          : null,
      };
    });

    return rows.sort((a, b) => {
      const aTime = a.enrolledAt ? new Date(a.enrolledAt).getTime() : 0;
      const bTime = b.enrolledAt ? new Date(b.enrolledAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  async updateEnrollmentStatus(
    classId: string,
    studentId: string,
    dto: UpdateEnrollmentStatusDto,
    approverId: string,
  ) {
    this.ensureValidClassId(classId);
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student id');
    }
    const updated = await this.enrollmentService.updateStatus(
      classId,
      studentId,
      dto,
      approverId,
    );
    const classEntity = await this.classModel.findById(classId).lean().exec();
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }
    return {
      message: 'Enrollment status updated',
      enrollment: this.mapEnrollmentResponse(updated, classEntity as Class & { _id: Types.ObjectId }),
    };
  }

  async assignInstructor(classId: string, instructorId: string) {
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid class id');
    }
    if (!Types.ObjectId.isValid(instructorId)) {
      throw new BadRequestException('Invalid instructor id');
    }

    const instructorObjectId = new Types.ObjectId(instructorId);

    const updated = await this.classModel
      .findByIdAndUpdate(
        classId,
        {
          instructorId: instructorObjectId,
          primaryInstructorId: instructorObjectId,
          $addToSet: { teacherIds: instructorObjectId },
        },
        { new: true },
      )
      .populate('instructorId', 'firstName lastName email avatarUrl')
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Class not found');
    }

    return updated;
  }

  async getClassRoster(classId: string) {
    this.ensureValidClassId(classId);
    const classEntity = await this.classModel
      .findById(classId)
      .select('title currency')
      .lean()
      .exec();
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }
    const enrollments = await this.enrollmentService.findByClass(classId);
    const students = enrollments
      .filter((e) => e.status !== 'withdrawn')
      .map((enrollment) => {
        const student = enrollment.studentId as { _id?: Types.ObjectId; firstName?: string; lastName?: string; email?: string; avatarUrl?: string } | undefined;
        return {
          _id: student?._id?.toString?.() ?? '',
          firstName: student?.firstName ?? null,
          lastName: student?.lastName ?? null,
          email: student?.email ?? '',
          avatarUrl: student?.avatarUrl ?? null,
          enrolledAt: enrollment.enrolledAt
            ? new Date(enrollment.enrolledAt).toISOString()
            : null,
          status: enrollment.status,
          amountPaid: enrollment.amountPaid ?? null,
          currency: enrollment.currency ?? classEntity.currency ?? 'ETB',
          paymentMethod: enrollment.paymentMethod ?? null,
          paymentReference: enrollment.paymentReference ?? null,
          note: enrollment.note ?? null,
          fullName: enrollment.fullName ?? null,
          phone: enrollment.phone ?? null,
          emergencyContactName: enrollment.emergencyContactName ?? null,
          emergencyContactPhone: enrollment.emergencyContactPhone ?? null,
          occupation: enrollment.occupation ?? null,
          city: enrollment.city ?? null,
          address: enrollment.address ?? null,
          preferredDaysPerWeek: enrollment.preferredDaysPerWeek ?? null,
          preferredSchedule: enrollment.preferredSchedule ?? null,
          learningGoals: enrollment.learningGoals ?? null,
          notesForTeacher: enrollment.notesForTeacher ?? null,
          receiptUrl: enrollment.receiptUrl ?? null,
        };
      });

    return {
      classId: (classEntity as { _id: Types.ObjectId })._id.toString(),
      title: classEntity.title,
      students,
    };
  }

  async getClassSchedule(classId: string) {
    this.ensureValidClassId(classId);
    const classEntity = await this.classModel
      .findById(classId)
      .select('schedule')
      .lean()
      .exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return this.mapScheduleResponse(classEntity.schedule ?? []);
  }

  async addScheduleItem(classId: string, dto: CreateScheduleItemDto) {
    this.ensureValidClassId(classId);
    const classEntity = await this.classModel.findById(classId).exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const start = new Date(dto.startTime);
    const end = dto.endTime ? new Date(dto.endTime) : undefined;

    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Invalid start time');
    }

    if (end && Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid end time');
    }

    if (end && end <= start) {
      throw new BadRequestException('End time must be after start time');
    }

    const newSession: ClassSession = {
      _id: new Types.ObjectId(),
      title: dto.title,
      startTime: start,
      endTime: end,
      location: dto.location,
      notes: dto.notes,
    };

    classEntity.schedule = classEntity.schedule ?? [];

    if (this.hasScheduleConflict(classEntity.schedule, newSession)) {
      throw new BadRequestException(
        'This session overlaps with an existing schedule entry',
      );
    }

    (classEntity.schedule as unknown as ClassSession[]).push(newSession);
    classEntity.markModified('schedule');
    await classEntity.save();

    return this.mapScheduleResponse(classEntity.schedule);
  }

  async updateScheduleItem(
    classId: string,
    sessionId: string,
    dto: UpdateScheduleItemDto,
  ) {
    this.ensureValidClassId(classId);
    const classEntity = await this.classModel.findById(classId).exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const targetIndex = (classEntity.schedule ?? []).findIndex(
      (session) => session._id?.toString() === sessionId,
    );

    if (targetIndex === -1) {
      throw new NotFoundException('Schedule entry not found');
    }

    const existingSession = classEntity.schedule[targetIndex];

    if (!existingSession) {
      throw new NotFoundException('Schedule entry not found');
    }

    const targetSession: ClassSession =
      existingSession as unknown as ClassSession;

    const nextSession: ClassSession = { ...targetSession };

    if (dto.title) {
      nextSession.title = dto.title;
    }

    if (dto.startTime) {
      const start = new Date(dto.startTime);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException('Invalid start time');
      }
      nextSession.startTime = start;
    }

    if (typeof dto.endTime !== 'undefined') {
      const end = dto.endTime ? new Date(dto.endTime) : undefined;
      if (end && Number.isNaN(end.getTime())) {
        throw new BadRequestException('Invalid end time');
      }
      nextSession.endTime = end;
    }

    if (typeof dto.location !== 'undefined') {
      nextSession.location = dto.location;
    }

    if (typeof dto.notes !== 'undefined') {
      nextSession.notes = dto.notes;
    }

    if (
      nextSession.endTime &&
      nextSession.startTime &&
      nextSession.endTime <= nextSession.startTime
    ) {
      throw new BadRequestException('End time must be after start time');
    }

    if (
      this.hasScheduleConflict(
        classEntity.schedule,
        nextSession,
        nextSession._id?.toString(),
      )
    ) {
      throw new BadRequestException(
        'This session overlaps with an existing schedule entry',
      );
    }

    (classEntity.schedule as unknown as ClassSession[])[targetIndex] =
      nextSession;
    classEntity.markModified('schedule');
    await classEntity.save();

    return this.mapScheduleResponse(classEntity.schedule);
  }

  async removeScheduleItem(classId: string, sessionId: string) {
    this.ensureValidClassId(classId);
    const classEntity = await this.classModel.findById(classId).exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const nextSchedule = (classEntity.schedule ?? []).filter(
      (session) => session._id?.toString() !== sessionId,
    );

    if (nextSchedule.length === (classEntity.schedule ?? []).length) {
      throw new NotFoundException('Schedule entry not found');
    }

    classEntity.schedule = nextSchedule;
    classEntity.markModified('schedule');
    await classEntity.save();

    return this.mapScheduleResponse(classEntity.schedule);
  }

  /** Phase 5.2: map class summaries using Enrollment collection data. */
  private mapClassSummariesFromEnrollments(
    classes: Array<Record<string, unknown> & { _id: Types.ObjectId }>,
    userId: string,
    enrollments: Array<{ classId?: { _id?: Types.ObjectId } | Types.ObjectId; status?: string; enrolledAt?: Date; amountPaid?: number; paymentMethod?: string; paymentReference?: string; currency?: string; note?: string }>,
    countByClassId: Map<string, number>,
  ) {
    return classes.map((klass) => {
      const classIdStr = klass._id.toString();
      const enrollmentCount = countByClassId.get(classIdStr) ?? 0;
      const myEnrollment = enrollments.find((e) => {
        const cid = (e.classId as { _id?: Types.ObjectId })?._id ?? e.classId;
        return cid?.toString() === classIdStr;
      });
      const instructorId =
        klass.instructorId instanceof Types.ObjectId
          ? klass.instructorId.toString()
          : typeof klass.instructorId === 'string'
            ? klass.instructorId
            : null;
      const teacherIds: string[] = Array.isArray((klass as any).teacherIds)
        ? ((klass as any).teacherIds as Array<Types.ObjectId | string>).map((id) =>
            id instanceof Types.ObjectId ? id.toString() : String(id),
          )
        : [];
      const createdAt =
        klass.createdAt instanceof Date ? (klass.createdAt as Date).toISOString() : null;
      const enrollmentDeadline =
        klass.enrollmentDeadline instanceof Date
          ? (klass.enrollmentDeadline as Date).toISOString()
          : null;
      const enrolledAt =
        myEnrollment?.enrolledAt instanceof Date
          ? myEnrollment.enrolledAt.toISOString()
          : null;
      return {
        _id: classIdStr,
        title: klass.title,
        isLive: klass.isLive ?? false,
        liveRoomCode: klass.liveRoomCode ?? null,
        instrumentType: klass.instrumentType,
        level: (klass as any).level ?? 'beginner',
        createdAt,
        instructorId: instructorId ?? null,
        teacherIds,
        tuition: klass.tuition ?? 0,
        currency: klass.currency ?? 'ETB',
        enrollmentDeadline,
        enrollmentCount,
        myEnrollment: myEnrollment
          ? {
              status: myEnrollment.status,
              amountPaid: myEnrollment.amountPaid ?? null,
              paymentMethod: myEnrollment.paymentMethod ?? null,
              paymentReference: myEnrollment.paymentReference ?? null,
              currency: myEnrollment.currency ?? (klass.currency as string) ?? 'ETB',
              note: myEnrollment.note ?? null,
              enrolledAt,
            }
          : null,
      };
    });
  }

  private mapScheduleResponse(schedule: ClassSession[]) {
    return (schedule ?? [])
      .map((session) => ({
        _id: session._id?.toString() ?? '',
        title: session.title,
        startTime: session.startTime?.toISOString() ?? null,
        endTime: session.endTime ? session.endTime.toISOString() : null,
        location: session.location ?? null,
        notes: session.notes ?? null,
      }))
      .sort((a, b) => {
        const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
        return aTime - bTime;
      });
  }

  private mapEnrollmentResponse(
    enrollment: {
      status: string;
      amountPaid?: number;
      paymentMethod?: string;
      paymentReference?: string;
      currency?: string;
      note?: string;
      enrolledAt?: Date | string | null;
      fullName?: string | null;
      phone?: string | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      occupation?: string | null;
      city?: string | null;
      address?: string | null;
      preferredDaysPerWeek?: number | null;
      preferredSchedule?: string | null;
      preferredTime?: string | null;
      preferredLearningDays?: string[] | null;
      registrationStartDate?: Date | string | null;
      learningGoals?: string | null;
      notesForTeacher?: string | null;
    },
    classEntity?: (Class & { _id?: Types.ObjectId }) | null,
  ) {
    const enrolledAt =
      enrollment.enrolledAt instanceof Date
        ? enrollment.enrolledAt.toISOString()
        : typeof enrollment.enrolledAt === 'string'
          ? enrollment.enrolledAt
          : null;

    return {
      status: enrollment.status,
      amountPaid: enrollment.amountPaid ?? null,
      paymentMethod: enrollment.paymentMethod ?? null,
      paymentReference: enrollment.paymentReference ?? null,
      currency: enrollment.currency ?? classEntity?.currency ?? 'ETB',
      note: enrollment.note ?? null,
      fullName: (enrollment as { fullName?: string | null }).fullName ?? null,
      phone: (enrollment as { phone?: string | null }).phone ?? null,
      emergencyContactName:
        (enrollment as { emergencyContactName?: string | null })
          .emergencyContactName ?? null,
      emergencyContactPhone:
        (enrollment as { emergencyContactPhone?: string | null })
          .emergencyContactPhone ?? null,
      occupation:
        (enrollment as { occupation?: string | null }).occupation ?? null,
      city: (enrollment as { city?: string | null }).city ?? null,
      address: (enrollment as { address?: string | null }).address ?? null,
      preferredDaysPerWeek:
        (enrollment as { preferredDaysPerWeek?: number | null })
          .preferredDaysPerWeek ?? null,
      preferredSchedule:
        (enrollment as { preferredSchedule?: string | null })
          .preferredSchedule ?? null,
      preferredTime:
        (enrollment as { preferredTime?: string | null }).preferredTime ?? null,
      preferredLearningDays:
        (enrollment as {
          preferredLearningDays?:
            | Array<
                | 'monday'
                | 'tuesday'
                | 'wednesday'
                | 'thursday'
                | 'friday'
                | 'saturday'
                | 'sunday'
              >
            | null;
        }).preferredLearningDays ?? null,
      registrationStartDate:
        (() => {
          const value = (enrollment as {
            registrationStartDate?: Date | string | null;
          }).registrationStartDate;
          if (!value) return null;
          if (value instanceof Date) return value.toISOString();
          if (typeof value === 'string') return value;
          return null;
        })(),
      learningGoals:
        (enrollment as { learningGoals?: string | null }).learningGoals ?? null,
      notesForTeacher:
        (enrollment as { notesForTeacher?: string | null }).notesForTeacher ??
        null,
      receiptUrl:
        (enrollment as { receiptUrl?: string | null }).receiptUrl ?? null,
      enrolledAt,
      classId: classEntity?._id ? classEntity._id.toString() : undefined,
      classTitle: classEntity?.title ?? null,
    };
  }

  private ensureValidClassId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Class not found');
    }
  }

  private hasScheduleConflict(
    schedule: ClassSession[] = [],
    candidate: ClassSession,
    ignoreId?: string,
  ) {
    const candidateStart = candidate.startTime?.getTime?.();
    const candidateEnd =
      candidate.endTime?.getTime?.() ??
      (candidateStart ? candidateStart + 60 * 60 * 1000 : undefined);

    if (!candidateStart || !candidateEnd) {
      return false;
    }

    return schedule.some((session) => {
      const sessionId = session._id?.toString?.();
      if (ignoreId && sessionId === ignoreId) {
        return false;
      }
      const start = session.startTime?.getTime?.();
      const end =
        session.endTime?.getTime?.() ??
        (start ? start + 60 * 60 * 1000 : undefined);
      if (!start || !end) {
        return false;
      }
      // overlap check: start < otherEnd && end > otherStart
      return candidateStart < end && candidateEnd > start;
    });
  }
}
