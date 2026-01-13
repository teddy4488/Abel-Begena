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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
