import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseTrackController } from './course-track.controller';
import { CourseTrackService } from './course-track.service';
import { CourseTrack, CourseTrackSchema } from './schemas/course-track.schema';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseTrack.name, schema: CourseTrackSchema },
    ]),
    AuthModule,
    UserModule,
  ],
  controllers: [CourseTrackController],
  providers: [CourseTrackService],
  exports: [CourseTrackService],
})
export class CourseTrackModule {}

