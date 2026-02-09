import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { NotificationService, CreateNotificationInput } from './notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RoleGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /** Current user's notifications (students, teachers, admins, etc.). */
  @Get('me')
  async getMyNotifications(@Request() req: { user: { sub: string } }) {
    return this.notificationService.listForUser(req.user.sub);
  }

  /** Mark a notification as read for the current user. */
  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.notificationService.markAsRead(req.user.sub, id);
  }

  /**
   * Admin/SuperAdmin: send a notification to one or more specific users.
   * This can be used for announcements like tuition changes or program updates.
   */
  @Post('admin/users')
  @Roles('Admin', 'SuperAdmin')
  async notifyUsers(
    @Body()
    body: {
      userIds: string[];
      notification: CreateNotificationInput;
    },
  ) {
    const created: unknown[] = [];
    for (const userId of body.userIds ?? []) {
      // swallow per-user failures so one bad id doesn't block the rest
      try {
        const item = await this.notificationService.createForUser(
          userId,
          body.notification,
        );
        created.push(item);
      } catch {
        // ignore invalid ids here; admin UI can surface errors if needed
      }
    }
    return { count: created.length, items: created };
  }
}

