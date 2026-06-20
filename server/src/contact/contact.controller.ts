import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MailService } from '../mail/mail.service';
import { SendContactInquiryDto } from './dto/send-contact-inquiry.dto';

/**
 * Public contact form. Throttled aggressively because it's open to anyone and
 * sends real email — without a cap, anyone could spam the school inbox.
 */
@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(private readonly mailService: MailService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 per minute per IP
  async sendInquiry(@Body() dto: SendContactInquiryDto) {
    try {
      await this.mailService.sendContactInquiryEmail({
        name: dto.name.trim(),
        fromEmail: dto.email.trim(),
        message: dto.message.trim(),
      });
      return { ok: true };
    } catch (err) {
      this.logger.error(
        `Failed to deliver contact inquiry from ${dto.email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      // Generic message — don't leak SMTP failure details to the public.
      if (err instanceof Error && err.message?.includes('not configured')) {
        throw new BadRequestException(
          'Contact form is temporarily unavailable. Please email us directly.',
        );
      }
      throw new InternalServerErrorException(
        'Could not deliver your message. Please try again shortly.',
      );
    }
  }
}
