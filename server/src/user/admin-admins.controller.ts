import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { getBranchFilter } from '../auth/guards/branch-scope.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { Types } from 'mongoose';

type ReqUser = { sub?: string; role?: string; branchId?: string };

@Controller('admin/admins')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('Admin', 'SuperAdmin')
export class AdminAdminsController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(@Request() req: { user?: ReqUser }) {
    const branchFilter = getBranchFilter(req.user);
    return this.userService.findAdmins(branchFilter);
  }

  @Post()
  @AuditLog({ action: 'admin_create', resource: 'admin' })
  async create(
    @Request() req: { user?: ReqUser },
    @Body() dto: CreateUserDto,
  ) {
    const branchFilter = getBranchFilter(req.user);
    const payload: CreateUserDto = {
      ...dto,
      role: 'Admin',
    };
    if (req.user?.role === 'Admin' && req.user.branchId) {
      payload.branchId = req.user.branchId;
    }
    return this.userService.create(payload);
  }

  @Patch(':id')
  @AuditLog({ action: 'admin_update', resource: 'admin', resourceIdParam: 'id' })
  async update(
    @Request() req: { user?: ReqUser },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    await this.ensureAdminInScope(req.user, id);
    const payload = { ...dto, role: 'Admin' as const };
    if (req.user?.role === 'Admin' && req.user.branchId) {
      delete (payload as Record<string, unknown>).branchId;
    }
    return this.userService.update(id, payload);
  }

  @Delete(':id')
  @AuditLog({ action: 'admin_remove', resource: 'admin', resourceIdParam: 'id' })
  async remove(@Request() req: { user?: ReqUser }, @Param('id') id: string) {
    await this.ensureAdminInScope(req.user, id);
    return this.userService.remove(id);
  }

  private async ensureAdminInScope(user: ReqUser | undefined, adminId: string) {
    const admin = await this.userService.findById(adminId);
    if (!admin || (admin as { role?: string }).role !== 'Admin') {
      throw new NotFoundException('Admin not found');
    }
    if (user?.role === 'Admin' && user.branchId) {
      const branchId = (admin as { branchId?: string | Types.ObjectId }).branchId;
      const branchStr =
        typeof branchId === 'string' ? branchId : branchId?.toString?.();
      if (branchStr !== user.branchId) {
        throw new ForbiddenException('You can only manage admins of your branch');
      }
    }
  }
}
