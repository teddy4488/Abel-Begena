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
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
   * Admin endpoint: list all branches (including inactive).
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('Admin')
  findAllAdmin() {
    return this.branchService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('Admin')
  create(@Body() dto: CreateBranchDto) {
    return this.branchService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('Admin')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('Admin')
  remove(@Param('id') id: string) {
    return this.branchService.remove(id);
  }
}


