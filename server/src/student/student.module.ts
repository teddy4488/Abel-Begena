import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StudentAttendanceParticipant,
  StudentAttendanceParticipantSchema,
} from '../attendance/schemas/student-attendance-participant.schema';
import { StudentService } from './student.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: StudentAttendanceParticipant.name,
        schema: StudentAttendanceParticipantSchema,
      },
    ]),
  ],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
