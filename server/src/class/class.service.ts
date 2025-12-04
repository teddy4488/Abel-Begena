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
  ClassEnrollment,
  ClassSession,
} from './schemas/class.schema';
import { UploadService } from '../upload/upload.service';
import { UpdateLiveStateDto } from './dto/update-live-state.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CreateScheduleItemDto } from './dto/create-schedule-item.dto';
import { UpdateScheduleItemDto } from './dto/update-schedule-item.dto';
import { EnrollClassDto, ClassPaymentMethod } from './dto/enroll-class.dto';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';

type AuthenticatedUser = {
  sub: string;
  role?: string;
};

@Injectable()
export class ClassService {
  constructor(
    @InjectModel(Class.name)
    private readonly classModel: Model<ClassDocument>,
    private readonly configService: ConfigService,
    private readonly uploadService: UploadService,
  ) {}

  async findForUser(user: AuthenticatedUser) {
    const userId = user.sub;
    const role = user.role;

    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }

    if (role === 'Admin') {
      const classes = await this.classModel
        .find()
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      return this.mapClassSummaries(classes, userId, true);
    }

    if (role === 'Teacher') {
      const classes = await this.classModel
        .find({ instructorId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      return this.mapClassSummaries(classes, userId, true);
    }

    const classes = await this.classModel
      .find({
        'enrollments.student': new Types.ObjectId(userId),
        'enrollments.status': { $ne: 'withdrawn' },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.mapClassSummaries(classes, userId, false);
  }

  async getManagedCatalog() {
    const classes = await this.classModel
      .find()
      .populate('instructorId', 'firstName lastName email avatarUrl')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return classes.map((klass) => ({
      ...klass,
      enrollmentCount: (klass.enrollments ?? []).filter(
        (enrollment) => enrollment.status !== 'withdrawn',
      ).length,
    }));
  }

  async createClass(dto: CreateClassDto) {
    const payload: Partial<Class> = {
      title: dto.title,
      description: dto.description,
      capacity: dto.capacity,
    };

    if (dto.instructorId) {
      if (!Types.ObjectId.isValid(dto.instructorId)) {
        throw new BadRequestException('Invalid instructor id');
      }
      payload.instructorId = new Types.ObjectId(dto.instructorId);
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

    if (typeof dto.capacity === 'number') {
      update.capacity = dto.capacity;
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
      update.instructorId = new Types.ObjectId(dto.instructorId);
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
    const removed = await this.classModel.findByIdAndDelete(id).lean().exec();
    if (!removed) {
      throw new NotFoundException('Class not found');
    }
    return { message: 'Class removed' };
  }

  async getPublicCatalog(limit = 6) {
    const classes = await this.classModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        'title description startDate endDate tuition currency capacity enrollmentDeadline enrollments instructorId createdAt',
      )
      .populate('instructorId', 'firstName lastName')
      .lean()
      .exec();

    return classes.map((klass) => {
      const enrollmentCount = (klass.enrollments ?? []).filter(
        (enrollment) => enrollment.status !== 'withdrawn',
      ).length;
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
        capacity: klass.capacity ?? null,
        enrollmentDeadline,
        enrollmentCount,
        instructorName,
        createdAt,
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
    const isEnrolled = (classEntity.enrollments ?? []).some(
      (enrollment) =>
        enrollment.student?.toString() === userId &&
        enrollment.status === 'active',
    );

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

    const url = await this.uploadService.uploadMaterial(file);

    classEntity.materials = classEntity.materials ?? [];

    classEntity.materials.push({
      title: title || file.originalname,
      url,
      uploadedAt: new Date(),
    });

    await classEntity.save();

    return classEntity;
  }

  async enrollStudent(classId: string, studentId: string, dto: EnrollClassDto) {
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

    const activeCount = (classEntity.enrollments ?? []).filter(
      (enrollment) => enrollment.status !== 'withdrawn',
    ).length;

    const studentObjectId = new Types.ObjectId(studentId);
    classEntity.enrollments = classEntity.enrollments ?? [];
    const existingIndex = classEntity.enrollments.findIndex(
      (enrollment) => enrollment.student?.toString() === studentId,
    );

    if (
      classEntity.capacity &&
      activeCount >= classEntity.capacity &&
      existingIndex === -1
    ) {
      throw new BadRequestException('This class has reached capacity');
    }

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

    const enrollmentPayload: ClassEnrollment = {
      student: studentObjectId,
      enrolledAt: new Date(),
      status: 'active' as const,
      amountPaid: dto.amount,
      currency,
      paymentMethod: dto.paymentMethod ?? ClassPaymentMethod.MANUAL,
      paymentReference: dto.paymentReference,
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
      learningGoals: dto.learningGoals,
      notesForTeacher: dto.notesForTeacher,
      receiptUrl: dto.receiptUrl,
    };

    if (existingIndex >= 0) {
      classEntity.enrollments[existingIndex] = {
        ...classEntity.enrollments[existingIndex],
        ...enrollmentPayload,
      };
    } else {
      classEntity.enrollments.push(enrollmentPayload);
    }

    classEntity.markModified('enrollments');
    await classEntity.save();

    const enrollment =
      classEntity.enrollments[
        existingIndex >= 0 ? existingIndex : classEntity.enrollments.length - 1
      ];

    return {
      message: 'Enrollment recorded',
      enrollment: this.mapEnrollmentResponse(enrollment, classEntity),
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
    );
    const enrichedDto: EnrollClassDto = {
      ...dto,
      receiptUrl,
    };
    return this.enrollStudent(classId, studentId, enrichedDto);
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

    const enrollment = (classEntity.enrollments ?? []).find(
      (entry) => entry.student?.toString() === studentId,
    );

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return this.mapEnrollmentResponse(
      enrollment,
      classEntity as Class & { _id: Types.ObjectId },
    );
  }

  async getStudentEnrollments(studentId: string) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student id');
    }

    const classes = await this.classModel
      .find({
        'enrollments.student': new Types.ObjectId(studentId),
      })
      .select(
        'title enrollments startDate endDate tuition currency enrollmentDeadline',
      )
      .lean()
      .exec();

    const entries = classes
      .map((klass) => {
        const enrollment = (klass.enrollments ?? []).find(
          (entry) => entry.student?.toString() === studentId,
        );
        if (!enrollment) {
          return null;
        }
        return {
          ...this.mapEnrollmentResponse(
            enrollment,
            klass as Class & { _id: Types.ObjectId },
          ),
          startDate: klass.startDate ? klass.startDate.toISOString() : null,
          endDate: klass.endDate ? klass.endDate.toISOString() : null,
          enrollmentDeadline: klass.enrollmentDeadline
            ? klass.enrollmentDeadline.toISOString()
            : null,
          tuition: klass.tuition ?? 0,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return entries.sort((a, b) => {
      const aTime = a.enrolledAt ? new Date(a.enrolledAt).getTime() : 0;
      const bTime = b.enrolledAt ? new Date(b.enrolledAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  async getAllEnrollments(status?: 'active' | 'pending' | 'withdrawn') {
    const statusFilter =
      typeof status === 'string' ? { 'enrollments.status': status } : {};

    const classes = await this.classModel
      .find(statusFilter)
      .select('title enrollments currency tuition instructorId')
      .populate('enrollments.student', 'firstName lastName email')
      .populate('instructorId', 'firstName lastName email')
      .lean()
      .exec();

    const enrollments = classes.flatMap((klass) => {
      const instructor =
        typeof klass.instructorId === 'object' && klass.instructorId
          ? `${
              (klass.instructorId as { firstName?: string; lastName?: string })
                .firstName ?? ''
            } ${
              (
                klass.instructorId as {
                  firstName?: string;
                  lastName?: string;
                }
              ).lastName ?? ''
            }`.trim() || null
          : null;

      return (klass.enrollments ?? [])
        .filter((entry) =>
          typeof status === 'string' ? entry.status === status : true,
        )
        .map((enrollment) => {
          const student = enrollment.student as
            | {
                _id: Types.ObjectId | string;
                firstName?: string;
                lastName?: string;
                email?: string;
              }
            | undefined;
          return {
            classId: klass._id?.toString?.() ?? '',
            classTitle: klass.title,
            instructor,
            student: {
              id: student?._id?.toString?.() ?? '',
              firstName: student?.firstName ?? null,
              lastName: student?.lastName ?? null,
              email: student?.email ?? '',
            },
            status: enrollment.status,
            amountPaid: enrollment.amountPaid ?? null,
            currency: enrollment.currency ?? klass.currency ?? 'ETB',
            paymentMethod: enrollment.paymentMethod ?? null,
            paymentReference: enrollment.paymentReference ?? null,
            note: enrollment.note ?? null,
            enrolledAt: enrollment.enrolledAt
              ? new Date(enrollment.enrolledAt).toISOString()
              : null,
          };
        });
    });

    return enrollments.sort((a, b) => {
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

    const classEntity = await this.classModel.findById(classId).exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const targetIndex = (classEntity.enrollments ?? []).findIndex(
      (enrollment) => enrollment.student?.toString() === studentId,
    );

    if (targetIndex === -1) {
      throw new NotFoundException('Enrollment not found');
    }

    classEntity.enrollments[targetIndex].status = dto.status;
    if (typeof dto.note !== 'undefined') {
      classEntity.enrollments[targetIndex].note = dto.note;
    }
    classEntity.enrollments[targetIndex].approvedBy = new Types.ObjectId(
      approverId,
    );
    classEntity.enrollments[targetIndex].approvedAt = new Date();

    classEntity.markModified('enrollments');
    await classEntity.save();

    return {
      message: 'Enrollment status updated',
      enrollment: this.mapEnrollmentResponse(
        classEntity.enrollments[targetIndex],
        classEntity,
      ),
    };
  }

  async assignInstructor(classId: string, instructorId: string) {
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid class id');
    }
    if (!Types.ObjectId.isValid(instructorId)) {
      throw new BadRequestException('Invalid instructor id');
    }

    const updated = await this.classModel
      .findByIdAndUpdate(
        classId,
        { instructorId: new Types.ObjectId(instructorId) },
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
    const roster = await this.classModel
      .findById(classId)
      .select('title enrollments currency')
      .populate('enrollments.student', 'firstName lastName email avatarUrl')
      .lean()
      .exec();

    if (!roster) {
      throw new NotFoundException('Class not found');
    }

    const students = (roster.enrollments ?? [])
      .filter((enrollment) => enrollment.status !== 'withdrawn')
      .map((enrollment) => {
        const student = enrollment.student as unknown as {
          _id: Types.ObjectId | string;
          firstName?: string;
          lastName?: string;
          email?: string;
          avatarUrl?: string;
        };

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
          currency: enrollment.currency ?? roster.currency ?? 'ETB',
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
      classId: roster._id.toString(),
      title: roster.title,
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

    const newSession: ClassSession = {
      _id: new Types.ObjectId(),
      title: dto.title,
      startTime: new Date(dto.startTime),
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      location: dto.location,
      notes: dto.notes,
    };

    classEntity.schedule = classEntity.schedule ?? [];
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

    if (dto.title) {
      targetSession.title = dto.title;
    }

    if (dto.startTime) {
      targetSession.startTime = new Date(dto.startTime);
    }

    if (typeof dto.endTime !== 'undefined') {
      targetSession.endTime = dto.endTime ? new Date(dto.endTime) : undefined;
    }

    if (typeof dto.location !== 'undefined') {
      targetSession.location = dto.location;
    }

    if (typeof dto.notes !== 'undefined') {
      targetSession.notes = dto.notes;
    }

    (classEntity.schedule as unknown as ClassSession[])[targetIndex] =
      targetSession;
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

  private mapClassSummaries(
    classes: Array<Class & { _id: Types.ObjectId }>,
    userId: string,
    includeInstructor: boolean,
  ) {
    return classes.map((klass) => {
      const enrollmentCount = (klass.enrollments ?? []).filter(
        (enrollment) => enrollment.status !== 'withdrawn',
      ).length;

      const myEnrollment = (klass.enrollments ?? []).find(
        (enrollment) => enrollment.student?.toString() === userId,
      );

      const instructorId =
        klass.instructorId instanceof Types.ObjectId
          ? klass.instructorId.toString()
          : typeof klass.instructorId === 'string'
            ? klass.instructorId
            : null;
      const createdAt =
        klass.createdAt instanceof Date ? klass.createdAt.toISOString() : null;
      const enrollmentDeadline =
        klass.enrollmentDeadline instanceof Date
          ? klass.enrollmentDeadline.toISOString()
          : null;
      const enrolledAt =
        myEnrollment?.enrolledAt instanceof Date
          ? myEnrollment.enrolledAt.toISOString()
          : null;

      return {
        _id: klass._id.toString(),
        title: klass.title,
        isLive: klass.isLive ?? false,
        liveRoomCode: klass.liveRoomCode ?? null,
        createdAt,
        instructorId: includeInstructor ? instructorId : null,
        tuition: klass.tuition ?? 0,
        currency: klass.currency ?? 'ETB',
        enrollmentDeadline,
        capacity: klass.capacity ?? null,
        enrollmentCount,
        myEnrollment: myEnrollment
          ? {
              status: myEnrollment.status,
              amountPaid: myEnrollment.amountPaid ?? null,
              paymentMethod: myEnrollment.paymentMethod ?? null,
              paymentReference: myEnrollment.paymentReference ?? null,
              currency: myEnrollment.currency ?? klass.currency ?? 'ETB',
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
      status: 'active' | 'pending' | 'withdrawn';
      amountPaid?: number;
      paymentMethod?: string;
      paymentReference?: string;
      currency?: string;
      note?: string;
      enrolledAt?: Date | string | null;
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
}
