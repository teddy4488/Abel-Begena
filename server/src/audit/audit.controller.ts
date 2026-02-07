import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import * as Express from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('Admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findRecent(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('adminId') adminId?: string,
    @Query('resource') resource?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.auditService.findRecent({
      limit: isNaN(limitNum) ? 50 : limitNum,
      offset: isNaN(offsetNum) ? 0 : offsetNum,
      adminId,
      resource,
      from: fromDate,
      to: toDate,
    });
  }

  @Get('export')
  async exportCsv(
    @Res() res: Express.Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('adminId') adminId?: string,
  ) {
    const csv = await this.auditService.exportCsv({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      adminId,
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }
}
