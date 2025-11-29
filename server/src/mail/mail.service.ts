import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

// 1. Define the shape of the response to satisfy strict linting
interface ResendResponse {
  data: { id: string } | null;
  error: { message: string; name: string } | null;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      this.logger.error('RESEND_API_KEY is not set. Mail delivery will fail.');
    }

    this.resend = new Resend(apiKey);

    this.fromAddress =
      this.configService.get<string>('EMAIL_FROM') ??
      'Abel Begena Conservatory <onboarding@resend.dev>';
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
      // 2. Cast the result to 'unknown' then to our Interface.
      // This tells the Linter: "I know what this data is, treat it as ResendResponse"
      const response = (await this.resend.emails.send({
        from: this.fromAddress,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      })) as unknown as ResendResponse;

      // Now we destructure from our safe variable
      const { data, error } = response;

      if (error) {
        this.logger.error(
          `Resend API Error for ${options.to}: ${error.message} (Type: ${error.name})`,
        );
        return;
      }

      this.logger.log(
        `Email sent to ${options.to} successfully. ID: ${data?.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Unexpected error sending email to ${options.to}: ${this.describeError(error)}`,
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