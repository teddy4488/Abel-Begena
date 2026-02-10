// mail/mail.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('EMAIL_HOST') ?? 'smtp.gmail.com',
          port: configService.get<number>('EMAIL_PORT') ?? 587,
          secure: configService.get<number>('EMAIL_PORT') === 465,
          auth: {
            user: configService.get<string>('EMAIL_USER') ?? '',
            pass: configService.get<string>('EMAIL_PASS') ?? '',
          },
          requireTLS: configService.get<number>('EMAIL_PORT') !== 465,
        },
        defaults: {
          from:
            configService.get<string>('EMAIL_FROM') ??
            'Abel Begena Conservatory <no-reply@abelbegena.com>',
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
