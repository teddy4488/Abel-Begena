import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ClassModule } from './class/class.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { BlogModule } from './blog/blog.module';
import { FaqModule } from './faq/faq.module';
import { AdminModule } from './admin/admin.module';
import { BranchModule } from './branch/branch.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PaymentModule } from './payment/payment.module';
import { MaterialsModule } from './materials/materials.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UploadModule } from './upload/upload.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { NotificationModule } from './notifications/notification.module';
import { ContactModule } from './contact/contact.module';
import { AdvertisementModule } from './advertisement/advertisement.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get<string>('THROTTLE_TTL') ?? 60),
            limit: Number(config.get<string>('THROTTLE_LIMIT') ?? 120),
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGO_URI') ??
          'mongodb://localhost:27017/abel-begena',
      }),
      inject: [ConfigService],
    }),
    UserModule,
    AuthModule,
    ClassModule,
    ProductModule,
    OrderModule,
    BlogModule,
    FaqModule,
    AdminModule,
    BranchModule,
    RealtimeModule,
    AttendanceModule,
    PaymentModule,
    MaterialsModule,
    UploadModule,
    EnrollmentModule,
    NotificationModule,
    ContactModule,
    AdvertisementModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
