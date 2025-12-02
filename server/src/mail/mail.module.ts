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
        // Use the config service to securely load environment variables
        transport: {
          host: configService.get<string>('EMAIL_HOST') ?? 'smtp.office365.com',
          port: configService.get<number>('EMAIL_PORT') ?? 587,
          secure: configService.get<number>('EMAIL_PORT') === 465,
          auth: {
            user:
              configService.get<string>('EMAIL_USER') ??
              'abelbegena@outlook.com',
            pass: configService.get<string>('EMAIL_PASS') ?? '',
          },
          // This is generally used for port 587 (STARTTLS)
          requireTLS: configService.get<number>('EMAIL_PORT') !== 465,
        },
        defaults: {
          // Default sender address
          from:
            configService.get<string>('EMAIL_FROM') ??
            'Abel Begena Conservatory <abelbegena@outlook.com>',
        },
        // Optional: Template engine setup (e.g., HandlebarsAdapter) would go here
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService], // Makes MailService available to other modules
})
export class MailModule {}
