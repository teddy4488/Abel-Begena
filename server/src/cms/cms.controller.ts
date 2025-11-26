import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CmsService } from './cms.service';
import { CreateContentBlockDto } from './dto/create-content-block.dto';
import { UpdateContentBlockDto } from './dto/update-content-block.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get()
  getPublicContent(@Query('lang') lang?: 'en' | 'am') {
    return this.cmsService.findAll(lang);
  }

  @Get('manage')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  listAll() {
    return this.cmsService.findAll();
  }

  @Post()
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  create(@Body() dto: CreateContentBlockDto) {
    return this.cmsService.create(dto);
  }

  @Patch(':key')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  update(@Param('key') key: string, @Body() dto: UpdateContentBlockDto) {
    return this.cmsService.update(key, dto);
  }

  @Delete(':key')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  remove(@Param('key') key: string) {
    return this.cmsService.remove(key);
  }
}
