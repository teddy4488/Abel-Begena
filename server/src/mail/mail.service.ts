import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  sendVerificationEmail(email: string, code: string) {
    this.logger.log(
      `Verification code for ${email}: ${code}. Configure a real email provider to deliver this code in production.`,
    );
  }
}
