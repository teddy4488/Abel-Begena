import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AttendanceService } from './attendance.service';
import { MailService } from '../mail/mail.service';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class PaymentReminderService {
  private readonly logger = new Logger(PaymentReminderService.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Runs daily at 09:00. Billing is consumption-based and admin-decided, so we do NOT
   * auto-dun every student: students are emailed only if they have opted in
   * (`autoReminders`), and admins always receive a digest of who currently owes. */
  @Cron('0 9 * * *')
  async handleDailyReminders() {
    await this.runDailyBilling();
  }

  async runDailyBilling() {
    let overdue: Awaited<
      ReturnType<AttendanceService['getOverduePayments']>
    > = [];
    try {
      overdue = await this.attendanceService.getOverduePayments();
    } catch (err) {
      this.logger.error(`Failed to compute owed students: ${err}`);
      return;
    }

    // 1) Student reminders — ONLY for students who have opted in (admin-decided).
    let sent = 0;
    for (const item of overdue) {
      if (!item.autoReminders) continue;
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
      this.logger.log(`Sent ${sent} opted-in payment reminder(s).`);
    }

    // 2) Admin digest — always notify admins of the current outstanding balances so
    //    the desk can decide whom to bill (no automatic dunning).
    if (overdue.length > 0) {
      await this.sendAdminDigest(overdue);
    }
  }

  private async sendAdminDigest(
    overdue: Awaited<ReturnType<AttendanceService['getOverduePayments']>>,
  ) {
    try {
      const admins = await this.userService.findAdmins();
      const totalPeriods = overdue.reduce((s, o) => s + (o.periodsOwed ?? 0), 0);
      const exceeded = overdue.filter((o) => o.windowExceeded).length;
      const message =
        `${overdue.length} student(s) have an outstanding balance ` +
        `(${totalPeriods} unpaid month(s)${exceeded ? `, ${exceeded} past the program window` : ''}).`;
      await Promise.all(
        admins.map((admin) => {
          const adminId = (
            admin as { _id?: { toString: () => string } }
          )._id?.toString();
          if (!adminId) return Promise.resolve();
          return this.notificationService
            .createForUser(adminId, {
              type: 'billing_digest',
              title: 'Daily billing summary',
              message,
              data: {
                studentsOwing: overdue.length,
                periodsOwed: totalPeriods,
                windowExceeded: exceeded,
              },
            })
            .catch(() => undefined);
        }),
      );
    } catch (err) {
      this.logger.warn(`Failed to send admin billing digest: ${err}`);
    }
  }
}
