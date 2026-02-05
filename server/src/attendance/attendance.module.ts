import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { UserModule } from '../user/user.module';
import { TeacherModule } from '../teacher/teacher.module';
import { MailModule } from '../mail/mail.module';
import { StudentModule } from '../student/student.module';
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
import { Class, ClassSchema } from '../class/schemas/class.schema';

@Module({
  imports: [
    UserModule,
    TeacherModule,
    MailModule,
    StudentModule,
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
      // Register Class model so AttendanceService can inject it
      { name: Class.name, schema: ClassSchema },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}

