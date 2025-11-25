import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@Request() req: { user: { sub: string; role: string } }) {
    return req.user;
  }
}
