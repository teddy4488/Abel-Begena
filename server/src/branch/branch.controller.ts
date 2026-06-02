import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  /**
   * Public endpoint: list active branches for guests/users.
   */
  @Get()
  findAllActive() {
    return this.branchService.findAllActive();
  }

  /**
   * Admin endpoint: list all branches (SuperAdmin) or only the admin's branch (branch Admin).
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('Admin', 'SuperAdmin')
  findAllAdmin(@Request() req: { user?: { role?: string; branchId?: string } }) {
    const branchId = req.user?.role === 'Admin' && req.user?.branchId
      ? String(req.user.branchId)
      : undefined;
    return this.branchService.findAll(branchId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('SuperAdmin')
  @AuditLog({ action: 'branch_create', resource: 'branch' })
  create(@Body() dto: CreateBranchDto) {
    return this.branchService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('SuperAdmin')
  @AuditLog({ action: 'branch_update', resource: 'branch', resourceIdParam: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('SuperAdmin')
  @AuditLog({ action: 'branch_delete', resource: 'branch', resourceIdParam: 'id' })
  remove(@Param('id') id: string) {
    return this.branchService.remove(id);
  }
}
