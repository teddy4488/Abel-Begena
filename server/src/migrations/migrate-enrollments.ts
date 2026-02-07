/**
 * Phase 5.2 one-off migration: copy Class.enrollments to Enrollment collection.
 * Run from server dir: npx ts-node -r tsconfig-paths/register src/migrations/migrate-enrollments.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Class, ClassSchema } from '../class/schemas/class.schema';
import { Enrollment, EnrollmentSchema } from '../enrollment/schemas/enrollment.schema';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/abel-begena';

async function run() {
  await mongoose.connect(MONGO_URI);
  const conn = mongoose.connection;
  const ClassModel = conn.models[Class.name] ?? mongoose.model(Class.name, ClassSchema);
  const EnrollmentModel = conn.models[Enrollment.name] ?? mongoose.model(Enrollment.name, EnrollmentSchema);

  const classes = await ClassModel.find({}).lean();
  let inserted = 0;
  let skipped = 0;
  for (const c of classes) {
    const enrollments = (c as { enrollments?: Array<Record<string, unknown>> }).enrollments ?? [];
    for (const en of enrollments) {
      const studentId = (en as { student?: unknown }).student;
      if (!studentId) continue;
      const existing = await EnrollmentModel.findOne({
        classId: (c as { _id: unknown })._id,
        studentId,
      }).lean();
      if (existing) {
        skipped++;
        continue;
      }
      await EnrollmentModel.create({
        classId: (c as { _id: unknown })._id,
        studentId,
        enrolledAt: (en as { enrolledAt?: Date }).enrolledAt ?? new Date(),
        status: (en as { status?: string }).status ?? 'active',
        amountPaid: (en as { amountPaid?: number }).amountPaid,
        currency: (en as { currency?: string }).currency,
        paymentMethod: (en as { paymentMethod?: string }).paymentMethod,
        paymentReference: (en as { paymentReference?: string }).paymentReference,
        note: (en as { note?: string }).note,
        fullName: (en as { fullName?: string }).fullName,
        phone: (en as { phone?: string }).phone,
        emergencyContactName: (en as { emergencyContactName?: string }).emergencyContactName,
        emergencyContactPhone: (en as { emergencyContactPhone?: string }).emergencyContactPhone,
        occupation: (en as { occupation?: string }).occupation,
        city: (en as { city?: string }).city,
        address: (en as { address?: string }).address,
        preferredDaysPerWeek: (en as { preferredDaysPerWeek?: number }).preferredDaysPerWeek,
        preferredSchedule: (en as { preferredSchedule?: string }).preferredSchedule,
        learningGoals: (en as { learningGoals?: string }).learningGoals,
        notesForTeacher: (en as { notesForTeacher?: string }).notesForTeacher,
        receiptUrl: (en as { receiptUrl?: string }).receiptUrl,
        approvedBy: (en as { approvedBy?: unknown }).approvedBy,
        approvedAt: (en as { approvedAt?: Date }).approvedAt,
        learningType: (en as { learningType?: string }).learningType,
        branchId: (en as { branchId?: unknown }).branchId,
        instrumentType: (en as { instrumentType?: string }).instrumentType,
        programDurationMonths: (en as { programDurationMonths?: number }).programDurationMonths,
        preferredLearningDays: (en as { preferredLearningDays?: string[] }).preferredLearningDays,
        preferredTime: (en as { preferredTime?: string }).preferredTime,
        registrationStartDate: (en as { registrationStartDate?: Date }).registrationStartDate,
      });
      inserted++;
    }
  }
  console.log('Enrollment migration done. Inserted:', inserted, 'Skipped (existing):', skipped);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
