import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  UploadService,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_IMAGE_SIZE_BYTES,
} from '../upload/upload.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly uploadService: UploadService,
  ) {}

  private notDeletedFilter() {
    return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
  }

  async findAll(includeInactive = false) {
    const query = includeInactive
      ? this.notDeletedFilter()
      : { ...this.notDeletedFilter(), isActive: true };
    return this.productModel.find(query).lean().exec();
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.productModel.findOne({ _id: id, ...this.notDeletedFilter() }).lean().exec();
  }

  async create(createProductDto: CreateProductDto) {
    this.validatePricing(
      createProductDto.price,
      createProductDto.discountPrice,
      createProductDto.promoActive ?? false,
    );

    const product = await this.productModel.create({
      ...createProductDto,
      images: createProductDto.images ?? [],
      attributes: createProductDto.attributes ?? {},
      promoActive: createProductDto.promoActive ?? false,
      isActive: createProductDto.isActive ?? true,
    });
    return product.toObject();
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (typeof updateProductDto.name !== 'undefined') {
      product.name = updateProductDto.name;
    }
    if (typeof updateProductDto.instrumentType !== 'undefined') {
      product.instrumentType = updateProductDto.instrumentType;
    }
    if (typeof updateProductDto.shortDescription !== 'undefined') {
      product.shortDescription = updateProductDto.shortDescription;
    }
    if (typeof updateProductDto.price === 'number') {
      product.price = updateProductDto.price;
    }
    if (typeof updateProductDto.stock === 'number') {
      product.stock = updateProductDto.stock;
    }
    if (Array.isArray(updateProductDto.images)) {
      product.images = updateProductDto.images;
    }
    if (typeof updateProductDto.attributes !== 'undefined') {
      product.attributes = updateProductDto.attributes ?? {};
    }
    if (typeof updateProductDto.isActive === 'boolean') {
      product.isActive = updateProductDto.isActive;
    }
    if ('discountPrice' in updateProductDto) {
      product.discountPrice = updateProductDto.discountPrice;
    }
    if (typeof updateProductDto.promoActive === 'boolean') {
      product.promoActive = updateProductDto.promoActive;
    }

    this.validatePricing(
      product.price,
      product.discountPrice,
      product.promoActive ?? false,
    );

    await product.save();

    return product.toObject();
  }

  async addImage(id: string, file: Express.Multer.File) {
    const product = await this.productModel.findById(id).exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const imageUrl = await this.uploadService.uploadMaterial(
      file,
      'abel-begena/products',
      {
        allowedMimeTypes: [...ALLOWED_IMAGE_MIMES],
        allowedExtensions: [...ALLOWED_IMAGE_EXTENSIONS],
        maxSizeBytes: MAX_IMAGE_SIZE_BYTES,
      },
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
      throw new BadRequestException('Insufficient stock');
    }

    product.stock -= quantity;
    await product.save();

    return product.toObject();
  }

  async delete(id: string) {
    const product = await this.productModel
      .findOne({ _id: id, ...this.notDeletedFilter() })
      .exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    await this.productModel
      .findByIdAndUpdate(id, { deletedAt: new Date(), isActive: false })
      .exec();
    return { message: 'Product deleted' };
  }

  private validatePricing(
    price: number,
    discountPrice?: number,
    promoActive = false,
  ) {
    if (
      promoActive &&
      (discountPrice === null || discountPrice === undefined)
    ) {
      throw new BadRequestException(
        'discountPrice is required while promoActive is true',
      );
    }

    if (typeof discountPrice === 'number' && discountPrice >= price) {
      throw new BadRequestException(
        'discountPrice must be lower than the base price',
      );
    }
  }
}
