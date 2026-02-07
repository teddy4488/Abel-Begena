import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FaqService } from './faq.service';
import { FaqController } from './faq.controller';
import { Faq, FaqSchema } from './schemas/faq.schema';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Faq.name, schema: FaqSchema }]),
    AuthModule,
    UserModule,
  ],
  controllers: [FaqController],
  providers: [FaqService],
})
export class FaqModule {}
