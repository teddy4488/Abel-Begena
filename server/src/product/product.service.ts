import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly uploadService: UploadService,
  ) {}

  async findAll(includeInactive = false) {
    const query = includeInactive ? {} : { isActive: true };
    return this.productModel.find(query).lean().exec();
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.productModel.findById(id).lean().exec();
  }

  async create(createProductDto: CreateProductDto) {
    const product = await this.productModel.create({
      ...createProductDto,
      images: createProductDto.images ?? [],
      attributes: createProductDto.attributes ?? {},
      isActive: createProductDto.isActive ?? true,
    });
    return product.toObject();
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .lean()
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async addImage(id: string, file: Express.Multer.File) {
    const product = await this.productModel.findById(id).exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const imageUrl = await this.uploadService.uploadMaterial(
      file,
      'abel-begena/products',
    );

    product.images = product.images ?? [];
    product.images.push(imageUrl);

    await product.save();

    return product.toObject();
  }

  async reduceStock(id: string, quantity: number) {
    const product = await this.productModel.findById(id).exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < quantity) {
      throw new NotFoundException('Insufficient stock');
    }

    product.stock -= quantity;
    await product.save();

    return product.toObject();
  }
}
