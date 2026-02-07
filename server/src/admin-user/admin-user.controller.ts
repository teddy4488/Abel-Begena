import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminUserService } from './admin-user.service';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { UpdateUserDto } from '../user/dto/update-user.dto';

type ReqUser = { sub: string; role?: string };

@Controller('admin/admins')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminUserController {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly userService: UserService,
  ) {}

  /** SuperAdmin: all admins. Branch Admin: admins of their branch. */
  @Get()
  @Roles('Admin', 'SuperAdmin')
  async findAll(@Request() req: { user: ReqUser & { branchId?: string } }) {
    if (req.user.role === 'SuperAdmin') {
      return this.userService.findAdmins();
    }
    if (req.user.role === 'Admin' && req.user.branchId) {
      return this.userService.findAdmins({ branchId: String(req.user.branchId) });
    }
    const self = await this.userService.findById(req.user.sub);
    if (!self || (self as { role?: string }).role !== 'Admin') {
      return [];
    }
    return [self];
  }

  @Get(':id')
  @Roles('Admin', 'SuperAdmin')
  async findOne(@Param('id') id: string, @Request() req: { user: ReqUser }) {
    if (req.user.role !== 'SuperAdmin' && req.user.sub !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }
    const user = await this.userService.findById(id);
    if (!user || (user as { role?: string }).role !== 'Admin') {
      return this.adminUserService.findById(id);
    }
    return user;
  }

  /** Phase 5.3: SuperAdmin only. Create User with role Admin and optional branchId. */
  @Post()
  @Roles('SuperAdmin')
  @UseGuards(SuperAdminGuard)
  create(@Body() dto: CreateUserDto) {
    return this.userService.create({
      ...dto,
      role: 'Admin',
      branchId: dto.branchId,
    });
  }

  @Patch(':id')
  @Roles('SuperAdmin')
  @UseGuards(SuperAdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, { ...dto, role: 'Admin' });
  }

  @Delete(':id')
  @Roles('SuperAdmin')
  @UseGuards(SuperAdminGuard)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
