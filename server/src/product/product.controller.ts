import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductImagesDto } from './dto/update-product-images.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MAX_IMAGE_SIZE_BYTES } from '../upload/upload.service';
import { RoleGuard } from '../auth/guards/role.guard';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productService.findAll({
      search,
      instrumentType: type,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('manage')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  findAllManaged(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productService.findAll({
      includeInactive: true,
      search,
      instrumentType: type,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.productService.findById(id);
    if (!product) {
      throw new BadRequestException('Product not found');
    }
    return product;
  }

  @Post()
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AuditLog({ action: 'product_create', resource: 'product' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Patch(':id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AuditLog({ action: 'product_update', resource: 'product', resourceIdParam: 'id' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Patch(':id/images')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AuditLog({ action: 'product_images', resource: 'product', resourceIdParam: 'id' })
  updateImages(
    @Param('id') id: string,
    @Body() dto: UpdateProductImagesDto,
  ) {
    return this.productService.updateImages(id, dto.images);
  }

  @Post(':id/images')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const updatedProduct = await this.productService.addImage(id, file);
    return {
      message: 'Image uploaded successfully',
      product: updatedProduct,
    };
  }

  @Delete(':id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AuditLog({ action: 'product_delete', resource: 'product', resourceIdParam: 'id' })
  delete(@Param('id') id: string) {
    return this.productService.delete(id);
  }
}
