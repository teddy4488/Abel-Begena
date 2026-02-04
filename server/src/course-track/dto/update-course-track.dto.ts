import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseTrackDto } from './create-course-track.dto';

export class UpdateCourseTrackDto extends PartialType(CreateCourseTrackDto) {}

