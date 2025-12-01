import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly fromAddress: string;
  /**
   * Required HTTP email relay endpoint (e.g. Cloudflare Worker, Resend, etc).
   * This service NEVER uses SMTP; all mail is sent via HTTPS JSON POST.
   */
  private readonly httpEndpoint: string | null;
  private readonly httpApiKey: string | null;

  constructor(private readonly configService: ConfigService) {
    this.fromAddress =
      this.configService.get<string>('EMAIL_FROM') ??
      'Abel Begena Conservatory <no-reply@abelbegena.com>';

    this.httpEndpoint =
      this.configService.get<string>('EMAIL_HTTP_ENDPOINT') ?? null;
    this.httpApiKey =
      this.configService.get<string>('EMAIL_HTTP_API_KEY') ?? null;

    if (!this.httpEndpoint) {
      this.logger.error(
        'EMAIL_HTTP_ENDPOINT is not set. Outbound email (OTP, verification, password reset) will NOT work until this is configured.',
      );
    } else {
      this.logger.log(
        `Using HTTP email relay at ${this.httpEndpoint} for outbound mail.`,
      );
    }
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
    if (!this.httpEndpoint) {
      this.logger.error(
        `Cannot send email to ${options.to}: EMAIL_HTTP_ENDPOINT is not configured.`,
      );
      return;
    }

    try {
      const payload = {
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.httpApiKey) {
        headers['Authorization'] = `Bearer ${this.httpApiKey}`;
      }

      const response = await fetch(this.httpEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
          `HTTP email relay responded with ${response.status} ${response.statusText}: ${text}`,
        );
      }
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
