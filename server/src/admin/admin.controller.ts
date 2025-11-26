import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';

@Controller('admin/dashboard')
@Roles('Admin')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics')
  getAnalyticsOverview() {
    return this.adminService.getAnalyticsOverview();
  }
}
