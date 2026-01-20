import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Get('manage')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  findAllManaged() {
    return this.productService.findAll(true);
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
  @Roles('Admin', 'Teacher')
  @UseGuards(JwtAuthGuard, RoleGuard)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Patch(':id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Post(':id/images')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
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

  @Patch(':id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  delete(@Param('id') id: string) {
    return this.productService.delete(id);
  }
}
