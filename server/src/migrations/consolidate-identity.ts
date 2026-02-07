/**
 * Phase 5.1 one-off migration: consolidate Teacher, AdminUser, and StudentAttendanceParticipant
 * into the User collection. Run from server dir: npx ts-node -r tsconfig-paths/register src/migrations/consolidate-identity.ts
 * Requires MONGO_URI in .env (or default mongodb://localhost:27017/abel-begena).
 */
import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserSchema } from '../user/schemas/user.schema';
import { TeacherSchema } from '../teacher/schemas/teacher.schema';
import { AdminUserSchema } from '../admin-user/schemas/admin-user.schema';
import { StudentAttendanceParticipantSchema } from '../attendance/schemas/student-attendance-participant.schema';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/abel-begena';

async function run() {
  await mongoose.connect(MONGO_URI);
  const conn = mongoose.connection;

  const UserModel = conn.models.User ?? mongoose.model('User', UserSchema);
  const TeacherModel = conn.models.Teacher ?? mongoose.model('Teacher', TeacherSchema);
  const AdminUserModel = conn.models.AdminUser ?? mongoose.model('AdminUser', AdminUserSchema);
  const ParticipantModel =
    conn.models.StudentAttendanceParticipant ??
    mongoose.model('StudentAttendanceParticipant', StudentAttendanceParticipantSchema);

  let teachersMigrated = 0;
  let teachersSkipped = 0;
  let adminsMigrated = 0;
  let adminsSkipped = 0;
  let studentsMigrated = 0;
  let studentsSkipped = 0;

  // 1. Teachers -> User (role Teacher, teacherProfile)
  const teachers = await TeacherModel.find({
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).lean();
  for (const t of teachers) {
    const email = (t as any).email?.toLowerCase?.();
    if (!email) continue;
    const existing = await UserModel.findOne({ email }).lean();
    if (existing) {
      teachersSkipped++;
      continue;
    }
    await UserModel.create({
      email,
      password: (t as any).password,
      firstName: (t as any).firstName,
      lastName: (t as any).lastName,
      phone: (t as any).phone,
      role: 'Teacher',
      isActive: (t as any).isActive ?? true,
      deletedAt: null,
      isVerified: (t as any).isVerified ?? false,
      verificationCode: (t as any).verificationCode,
      verificationCodeExpiresAt: (t as any).verificationCodeExpiresAt,
      teacherStatus: (t as any).teacherStatus,
      teacherProfile: { teacherStatus: (t as any).teacherStatus ?? 'pending' },
      avatarUrl: (t as any).avatarUrl,
      languagePreference: (t as any).languagePreference ?? 'en',
      passwordResetCode: (t as any).passwordResetCode,
      passwordResetCodeExpiresAt: (t as any).passwordResetCodeExpiresAt,
      refreshTokenHash: (t as any).refreshTokenHash,
      refreshTokenExpiresAt: (t as any).refreshTokenExpiresAt,
    });
    teachersMigrated++;
  }

  // 2. AdminUser -> User (role Admin)
  const admins = await AdminUserModel.find({
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).lean();
  for (const a of admins) {
    const email = (a as any).email?.toLowerCase?.();
    if (!email) continue;
    const existing = await UserModel.findOne({ email }).lean();
    if (existing) {
      adminsSkipped++;
      continue;
    }
    await UserModel.create({
      email,
      password: (a as any).password,
      firstName: (a as any).firstName,
      lastName: (a as any).lastName,
      phone: (a as any).phone,
      role: 'Admin',
      isActive: (a as any).isActive ?? true,
      deletedAt: null,
      isVerified: (a as any).isVerified ?? false,
      verificationCode: (a as any).verificationCode,
      verificationCodeExpiresAt: (a as any).verificationCodeExpiresAt,
      avatarUrl: (a as any).avatarUrl,
      languagePreference: (a as any).languagePreference ?? 'en',
      passwordResetCode: (a as any).passwordResetCode,
      passwordResetCodeExpiresAt: (a as any).passwordResetCodeExpiresAt,
      refreshTokenHash: (a as any).refreshTokenHash,
      refreshTokenExpiresAt: (a as any).refreshTokenExpiresAt,
    });
    adminsMigrated++;
  }

  // 3. StudentAttendanceParticipant (with email) -> User (role Student, studentProfile) + set participant.userId
  const participants = await ParticipantModel.find({
    $and: [
      { email: { $exists: true } },
      { email: { $nin: [null, ''] } },
      { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
    ],
  }).lean();
  for (const p of participants) {
    const email = (p as any).email?.toLowerCase?.();
    if (!email) continue;
    let user = await UserModel.findOne({ email }).lean();
    if (!user) {
      const studentProfile = {
        attendanceNumber: (p as any).attendanceNumber,
        fullName: (p as any).fullName,
        branchId: (p as any).branchId,
        learningType: (p as any).learningType,
        instrumentType: (p as any).instrumentType,
        programDurationMonths: (p as any).programDurationMonths,
        preferredLearningDays: (p as any).preferredLearningDays,
        registrationStartDate: (p as any).registrationStartDate,
        learningDaysPerWeek: (p as any).learningDaysPerWeek,
        isActive: (p as any).isActive ?? true,
        missedLessonsCount: (p as any).missedLessonsCount ?? 0,
      };
      const created = await UserModel.create({
        email,
        password: (p as any).password ?? (await bcrypt.hash('change-me-' + (p as any)._id, 10)),
        firstName: ((p as any).fullName ?? '').split(' ')[0],
        lastName: ((p as any).fullName ?? '').split(' ').slice(1).join(' ') || undefined,
        role: 'Student',
        isActive: true,
        deletedAt: null,
        isVerified: (p as any).isVerified ?? false,
        verificationCode: (p as any).verificationCode,
        verificationCodeExpiresAt: (p as any).verificationCodeExpiresAt,
        studentProfile,
        avatarUrl: undefined,
        languagePreference: 'en',
        passwordResetCode: (p as any).passwordResetCode,
        passwordResetCodeExpiresAt: (p as any).passwordResetCodeExpiresAt,
        refreshTokenHash: (p as any).refreshTokenHash,
        refreshTokenExpiresAt: (p as any).refreshTokenExpiresAt,
      });
      user = created.toObject();
      studentsMigrated++;
    } else {
      studentsSkipped++;
    }
    const userId = (user as any)._id;
    if (userId) {
      await ParticipantModel.updateOne(
        { _id: (p as any)._id },
        { $set: { userId } },
      );
    }
  }

  console.log('Consolidate-identity migration done.');
  console.log('Teachers: migrated', teachersMigrated, 'skipped (existing User)', teachersSkipped);
  console.log('Admins: migrated', adminsMigrated, 'skipped', adminsSkipped);
  console.log('Students (participants): migrated', studentsMigrated, 'skipped', studentsSkipped);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
