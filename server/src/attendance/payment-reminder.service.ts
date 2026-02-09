import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AttendanceService } from './attendance.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class PaymentReminderService {
  private readonly logger = new Logger(PaymentReminderService.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  /** Runs daily at 09:00; override with PAYMENT_REMINDER_CRON (e.g. "0 9 * * *"). */
  @Cron('0 9 * * *')
  async handleDailyReminders() {
    await this.sendOverdueReminders();
    const daysAhead = this.configService.get<number>('PAYMENT_DUE_SOON_DAYS') ?? 3;
    await this.sendDueSoonReminders(daysAhead);
  }

  /**
   * Runs daily in the evening to auto-mark students as absent when they were
   * expected to attend but have no attendance record for the day.
   * The cron expression can be overridden via AUTO_ABSENCE_CRON if needed.
   */
  @Cron(process.env.AUTO_ABSENCE_CRON || '0 19 * * *')
  async handleDailyAutoAbsences() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expected = await this.attendanceService.getExpectedStudentsForDate(today);
    if (!expected.length) {
      return;
    }

    const participantIds = expected.map((e) => e.participantId);
    // For each expected participant/class pair, ensure we have at least one attendance record today.
    for (const session of expected) {
      try {
        await this.attendanceService.ensureAbsenceRecordForParticipantOnDate(
          session.participantId,
          today,
        );
      } catch (err) {
        this.logger.warn(
          `Failed to auto-mark absence for participant ${session.participantId}: ${err}`,
        );
      }
    }
  }

  async sendOverdueReminders() {
    try {
      const overdue = await this.attendanceService.getOverduePayments();
      let sent = 0;
      for (const item of overdue) {
        const email = item.email?.trim();
        if (!email) continue;
        try {
          await this.mailService.sendPaymentOverdueEmail(
            email,
            item.fullName,
            item.attendanceNumber,
            item.dueDate,
            item.daysOverdue,
            item.amount,
          );
          sent += 1;
        } catch (err) {
          this.logger.warn(`Failed to send overdue reminder to ${email}: ${err}`);
        }
      }
      if (sent > 0) {
        this.logger.log(`Sent ${sent} overdue payment reminder(s).`);
      }
    } catch (err) {
      this.logger.error(`Overdue reminders failed: ${err}`);
    }
  }

  async sendDueSoonReminders(daysAhead: number = 3) {
    try {
      const upcoming = await this.attendanceService.getUpcomingPaymentsForAllStudents(daysAhead);
      let sent = 0;
      for (const item of upcoming) {
        try {
          await this.mailService.sendPaymentDueSoonEmail(
            item.email,
            item.fullName,
            item.dueDate,
            item.daysUntilDue,
            item.amount,
          );
          sent += 1;
        } catch (err) {
          this.logger.warn(`Failed to send due-soon reminder to ${item.email}: ${err}`);
        }
      }
      if (sent > 0) {
        this.logger.log(`Sent ${sent} due-soon payment reminder(s).`);
      }
    } catch (err) {
      this.logger.error(`Due-soon reminders failed: ${err}`);
    }
  }
}
