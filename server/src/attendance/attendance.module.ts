import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
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

@Module({
  imports: [
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
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}

