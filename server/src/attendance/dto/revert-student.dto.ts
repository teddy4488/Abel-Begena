import { IsEnum } from 'class-validator';

export class RevertStudentDto {
  /** Why the student is leaving — drives the participant's completionStatus. */
  @IsEnum(['completed', 'withdrawn', 'dropped'])
  reason: 'completed' | 'withdrawn' | 'dropped';
}
