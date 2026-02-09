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

  async sendStudentCredentialsEmail(
    email: string,
    password: string,
    fullName: string,
  ) {
    await this.sendMail({
      to: email,
      subject: 'Welcome to Abel Begena Conservatory - Your Student Account',
      html: this.renderCredentialsTemplate({
        greeting: `Peace be with you, ${fullName}`,
        intro:
          'Your student account has been created. Please use the following credentials to log in. You will be required to change your password on first login.',
        email,
        password,
        outro:
          'Please keep these credentials secure. You will be prompted to change your password when you first log in.',
      }),
    });
  }

  async sendTeacherCredentialsEmail(
    email: string,
    password: string,
    fullName: string,
  ) {
    await this.sendMail({
      to: email,
      subject: 'Welcome to Abel Begena Conservatory - Your Teacher Account',
      html: this.renderCredentialsTemplate({
        greeting: `Peace be with you, ${fullName}`,
        intro:
          'Your teacher account has been created. Please use the following credentials to log in. You will be required to change your password on first login.',
        email,
        password,
        outro:
          'Please keep these credentials secure. You will be prompted to change your password when you first log in.',
      }),
    });
  }

  async sendPaymentOverdueEmail(
    to: string,
    fullName: string,
    attendanceNumber: string,
    dueDate: Date,
    daysOverdue: number,
    amount?: number,
  ) {
    const dueStr = dueDate.toLocaleDateString();
    const intro =
      daysOverdue === 1
        ? `A payment was due on ${dueStr} for your studies at Abel Begena Conservatory (student #${attendanceNumber}).`
        : `A payment was due on ${dueStr} (${daysOverdue} days ago) for your studies at Abel Begena Conservatory (student #${attendanceNumber}).`;
    await this.sendMail({
      to,
      subject: 'Payment reminder: Abel Begena Conservatory',
      html: this.renderPaymentReminderTemplate({
        greeting: `Peace be with you, ${fullName}`,
        intro,
        ...(amount ? { amount, currency: 'ETB' } : {}),
        outro: 'Please arrange payment at your earliest convenience. If you have already paid, please disregard this message.',
      }),
    });
  }

  async sendPaymentDueSoonEmail(
    to: string,
    fullName: string,
    dueDate: Date,
    daysUntilDue: number,
    amount?: number,
  ) {
    const dueStr = dueDate.toLocaleDateString();
    const intro =
      daysUntilDue === 0
        ? `A payment is due today (${dueStr}) for your studies at Abel Begena Conservatory.`
        : daysUntilDue === 1
          ? `A payment is due tomorrow (${dueStr}) for your studies at Abel Begena Conservatory.`
          : `A payment is due in ${daysUntilDue} days (${dueStr}) for your studies at Abel Begena Conservatory.`;
    await this.sendMail({
      to,
      subject: 'Upcoming payment: Abel Begena Conservatory',
      html: this.renderPaymentReminderTemplate({
        greeting: `Peace be with you, ${fullName}`,
        intro,
        ...(amount ? { amount, currency: 'ETB' } : {}),
        outro: 'Please ensure payment is made by the due date.',
      }),
    });
  }

  async sendOrderConfirmationEmail(
    to: string,
    fullName: string,
    orderId: string,
    totalAmount: number,
    currency: string = 'ETB',
  ) {
    await this.sendMail({
      to,
      subject: 'Order confirmation – Abel Begena Conservatory',
      html: this.renderOrderConfirmationTemplate({
        greeting: fullName ? `Peace be with you, ${fullName}` : 'Peace be with you,',
        intro: 'Your order has been received.',
        orderId,
        totalAmount,
        currency,
        outro: 'We will notify you when your payment is confirmed and when your order is on its way.',
      }),
    });
  }

  async sendPaymentApprovedEmail(
    to: string,
    fullName: string,
    paymentType: string,
    amount: number,
    currency: string = 'ETB',
  ) {
    const typeLabel =
      paymentType === 'enrollment'
        ? 'Enrollment'
        : paymentType === 'order'
          ? 'Order'
          : paymentType === 'student_monthly_fee'
            ? 'Monthly fee'
            : paymentType;
    await this.sendMail({
      to,
      subject: 'Payment approved – Abel Begena Conservatory',
      html: this.renderPaymentReminderTemplate({
        greeting: fullName ? `Peace be with you, ${fullName}` : 'Peace be with you,',
        intro: `Your ${typeLabel} payment has been approved.`,
        amount,
        currency,
        outro: 'Thank you for your payment.',
      }),
    });
  }

  async sendEnrollmentApprovedEmail(
    to: string,
    fullName: string,
    classTitle: string,
    enrollmentId: string | null,
    amount?: number,
    currency: string = 'ETB',
  ) {
    await this.sendMail({
      to,
      subject: 'Enrollment approved – Abel Begena Conservatory',
      html: this.renderPaymentReminderTemplate({
        greeting: fullName ? `Peace be with you, ${fullName}` : 'Peace be with you,',
        intro: enrollmentId
          ? `Your enrollment for "${classTitle}" (ID: ${enrollmentId}) has been approved. You now have access to your class, lessons, and materials.`
          : `Your enrollment for "${classTitle}" has been approved. You now have access to your class, lessons, and materials.`,
        ...(typeof amount === 'number' ? { amount, currency } : {}),
        outro:
          'Thank you for joining Abel Begena Conservatory. We look forward to supporting your musical journey.',
      }),
    });
  }

  async sendPaymentRejectedEmail(
    to: string,
    fullName: string,
    paymentType: string,
    reason?: string,
    amount?: number,
    currency: string = 'ETB',
  ) {
    const typeLabel =
      paymentType === 'enrollment'
        ? 'Enrollment'
        : paymentType === 'order'
          ? 'Order'
          : paymentType === 'student_monthly_fee'
            ? 'Monthly fee'
            : paymentType;
    const intro = reason
      ? `Your ${typeLabel} payment could not be approved for the following reason: ${reason}.`
      : `Your ${typeLabel} payment could not be approved. Please contact the school for more details or upload a new receipt.`;
    await this.sendMail({
      to,
      subject: 'Payment not approved – Abel Begena Conservatory',
      html: this.renderPaymentReminderTemplate({
        greeting: fullName ? `Peace be with you, ${fullName}` : 'Peace be with you,',
        intro,
        ...(typeof amount === 'number' ? { amount, currency } : {}),
        outro:
          'If you believe this is an error or have already paid, please reach out to us or upload a new receipt so we can review it again.',
      }),
    });
  }

  async sendOrderStatusUpdatedEmail(
    to: string,
    fullName: string,
    orderId: string,
    status: string,
    isPaid: boolean,
  ) {
    const statusLabel = status;
    const intro = isPaid
      ? `The status of your order ${orderId} has been updated to "${statusLabel}".`
      : `The status of your order ${orderId} has been updated to "${statusLabel}". Please note that payment is still pending.`;
    await this.sendMail({
      to,
      subject: 'Order update – Abel Begena Conservatory',
      html: this.renderPaymentReminderTemplate({
        greeting: fullName ? `Peace be with you, ${fullName}` : 'Peace be with you,',
        intro,
        outro: 'Thank you for your order. We will keep you updated as it progresses.',
      }),
    });
  }

  private renderOrderConfirmationTemplate(payload: {
    greeting: string;
    intro: string;
    orderId: string;
    totalAmount: number;
    currency: string;
    outro: string;
  }) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <p>${payload.greeting}</p>
        <p>${payload.intro}</p>
        <p style="margin: 16px 0;"><strong>Order ID:</strong> ${payload.orderId}</p>
        <p style="margin: 16px 0;"><strong>Total:</strong> ${payload.totalAmount} ${payload.currency}</p>
        <p>${payload.outro}</p>
        <p style="margin-top: 32px;">With gratitude,<br/>Abel Begena Conservatory</p>
      </div>
    `;
  }

  private renderPaymentReminderTemplate(payload: {
    greeting: string;
    intro: string;
    amount?: number;
    currency?: string;
    outro: string;
  }) {
    const amountBlock =
      payload.amount != null
        ? `<p style="margin: 16px 0;"><strong>Amount:</strong> ${payload.amount} ${payload.currency ?? 'ETB'}</p>`
        : '';
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <p>${payload.greeting}</p>
        <p>${payload.intro}</p>
        ${amountBlock}
        <p>${payload.outro}</p>
        <p style="margin-top: 32px;">With gratitude,<br/>Abel Begena Conservatory</p>
      </div>
    `;
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

  private renderCredentialsTemplate(payload: {
    greeting: string;
    intro: string;
    email: string;
    password: string;
    outro: string;
  }) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <p>${payload.greeting}</p>
        <p>${payload.intro}</p>
        <div style="margin: 24px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #f7d794;">
          <p style="margin: 8px 0;"><strong>Email:</strong> ${payload.email}</p>
          <p style="margin: 8px 0;"><strong>Password:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${payload.password}</code></p>
        </div>
        <p style="color: #d32f2f; font-weight: bold;">⚠️ Important: You must change your password when you first log in.</p>
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
