import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminUserService } from './admin-user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { AdminUser } from './schemas/admin-user.schema';

@Controller('admin/admins')
@Roles('Admin')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  findAll() {
    return this.adminUserService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminUserService.findById(id);
  }

  @Post()
  create(
    @Body()
    createAdminDto: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      isActive?: boolean;
      isVerified?: boolean;
    },
  ) {
    return this.adminUserService.create(createAdminDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdminDto: Partial<AdminUser>) {
    return this.adminUserService.update(id, updateAdminDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminUserService.remove(id);
  }
}
