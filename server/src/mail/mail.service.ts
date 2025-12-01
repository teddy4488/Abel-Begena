import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter<SMTPTransport.Options>;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    this.fromAddress =
      this.configService.get<string>('EMAIL_FROM') ??
      'Abel Begena Conservatory <abelbegena@outlook.com>';
    const host =
      this.configService.get<string>('EMAIL_HOST') ?? 'smtp.office365.com';
    const port = Number(this.configService.get<string>('EMAIL_PORT') ?? 587);
    const user =
      this.configService.get<string>('EMAIL_USER') ?? 'abelbegena@outlook.com';
    const pass = this.configService.get<string>('EMAIL_PASS') ?? '';

    if (!pass) {
      this.logger.warn(
        'EMAIL_PASS is not set. Mail delivery will fail until valid Outlook credentials are configured.',
      );
    }

    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
    }) as Transporter<SMTPTransport.Options>;

    // void this.verifyConnection();
  }

  async sendVerificationEmail(email: string, code: string) {
    await this.sendMail({
      to: email,
      subject: 'Verify your Abel Begena account',
      html: this.renderTemplate({
        greeting: 'Peace be with you,',
        intro:
          'Please enter the following 6-digit code to verify your Abel Begena account.',
        code,
        outro:
          'This code expires in 15 minutes. If you did not create an account, please ignore this message.',
      }),
    });
  }

  async sendPasswordResetEmail(email: string, code: string) {
    await this.sendMail({
      to: email,
      subject: 'Reset your Abel Begena password',
      html: this.renderTemplate({
        greeting: 'Peace be with you,',
        intro:
          'Use the 6-digit code below to reset your password. Enter it on the password reset page to continue.',
        code,
        outro: 'If you did not request a reset, you can disregard this email.',
      }),
    });
  }

  private async sendMail(options: {
    to: string;
    subject: string;
    html: string;
  }) {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        ...options,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${this.describeError(error)}`,
      );
    }
  }

  private renderTemplate(payload: {
    greeting: string;
    intro: string;
    code: string;
    outro: string;
  }) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>${payload.greeting}</p>
        <p>${payload.intro}</p>
        <div style="margin: 24px 0; text-align: center;">
          <span style="
            display: inline-block;
            font-size: 24px;
            letter-spacing: 8px;
            font-weight: bold;
            padding: 12px 24px;
            border-radius: 12px;
            background: #f7d794;
            color: #2f1c0a;
          ">
            ${payload.code}
          </span>
        </div>
        <p>${payload.outro}</p>
        <p style="margin-top: 32px;">With gratitude,<br/>Abel Begena Conservatory</p>
      </div>
    `;
  }

  // private async verifyConnection() {
  //   try {
  //     await this.transporter.verify();
  //     this.logger.log('SMTP connection verified successfully.');
  //   } catch (error) {
  //     this.logger.error(
  //       `Unable to verify SMTP credentials at startup: ${this.describeError(error)}`,
  //     );
  //   }
  // }

  private describeError(error: unknown) {
    if (error instanceof Error) {
      return error.stack ?? error.message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
