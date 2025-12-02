import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { ClassModule } from '../class/class.module';

@Module({
  imports: [ClassModule],
  providers: [LiveGateway],
})
export class RealtimeModule {}


