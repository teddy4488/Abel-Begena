import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { ClassModule } from '../class/class.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';

@Module({
  imports: [ClassModule, EnrollmentModule],
  providers: [LiveGateway],
})
export class RealtimeModule { }
