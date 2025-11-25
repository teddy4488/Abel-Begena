import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  findAll() {
    return this.userService.findAll();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@Request() req: { user: { sub: string; role: string } }) {
    return this.userService.findById(req.user.sub);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Request() req: { user: { sub: string } },
    @Body() dto: UpdateUserDto,
  ) {
    const payload: UpdateUserDto = {};
    if (typeof dto.firstName !== 'undefined') {
      payload.firstName = dto.firstName;
    }
    if (typeof dto.lastName !== 'undefined') {
      payload.lastName = dto.lastName;
    }
    if (typeof dto.phone !== 'undefined') {
      payload.phone = dto.phone;
    }
    return this.userService.update(req.user.sub, payload);
  }
}
