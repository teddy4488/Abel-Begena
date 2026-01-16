import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { UserModule } from '../user/user.module';
import {
  TeacherAttendanceParticipant,
  TeacherAttendanceParticipantSchema,
} from './schemas/teacher-attendance-participant.schema';
import {
  StudentAttendanceParticipant,
  StudentAttendanceParticipantSchema,
} from './schemas/student-attendance-participant.schema';
import {
  TeacherAttendance,
  TeacherAttendanceSchema,
} from './schemas/teacher-attendance.schema';
import {
  StudentAttendance,
  StudentAttendanceSchema,
} from './schemas/student-attendance.schema';
import {
  InstrumentLesson,
  InstrumentLessonSchema,
} from './schemas/instrument-lesson.schema';
import {
  StudentPayment,
  StudentPaymentSchema,
} from './schemas/student-payment.schema';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      {
        name: TeacherAttendanceParticipant.name,
        schema: TeacherAttendanceParticipantSchema,
      },
      {
        name: StudentAttendanceParticipant.name,
        schema: StudentAttendanceParticipantSchema,
      },
      { name: TeacherAttendance.name, schema: TeacherAttendanceSchema },
      { name: StudentAttendance.name, schema: StudentAttendanceSchema },
      { name: InstrumentLesson.name, schema: InstrumentLessonSchema },
      { name: StudentPayment.name, schema: StudentPaymentSchema },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}

