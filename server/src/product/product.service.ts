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
import { notDeletedFilter } from '../common/filters/not-deleted.filter';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly uploadService: UploadService,
  ) {}

  async findAll(options?: {
    includeInactive?: boolean;
    search?: string;
    instrumentType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: ProductDocument[]; total: number }> {
    const {
      includeInactive = false,
      search,
      instrumentType,
      page,
      limit,
    } = options ?? {};

    const query: Record<string, unknown> = includeInactive
      ? { ...notDeletedFilter() }
      : { ...notDeletedFilter(), isActive: true };

    if (instrumentType) {
      query.instrumentType = instrumentType;
    }
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { shortDescription: regex }];
    }

    const cursor = this.productModel.find(query).sort({ createdAt: -1 });

    // Apply pagination only when a positive limit is provided.
    if (typeof limit === 'number' && limit > 0) {
      const safePage = typeof page === 'number' && page > 0 ? page : 1;
      cursor.skip((safePage - 1) * limit).limit(limit);
    }

    const [items, total] = await Promise.all([
      cursor.lean<ProductDocument[]>().exec(),
      this.productModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.productModel.findOne({ _id: id, ...notDeletedFilter() }).lean().exec();
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
      lowStockThreshold:
        typeof createProductDto.lowStockThreshold === 'number'
          ? createProductDto.lowStockThreshold
          : 0,
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
    if (typeof updateProductDto.lowStockThreshold === 'number') {
      product.lowStockThreshold = updateProductDto.lowStockThreshold;
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

  /**
   * Atomically decrement stock. The conditional filter (`stock >= quantity`)
   * makes the check-and-decrement a single DB operation, eliminating the
   * oversell race between two concurrent checkouts.
   */
  async reduceStock(id: string, quantity: number) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Product not found');
    }
    const updated = await this.productModel
      .findOneAndUpdate(
        { _id: id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new BadRequestException('Insufficient stock');
    }

    return updated;
  }

  /** Atomically return stock to inventory (order cancellation / payment rejection). */
  async restoreStock(id: string, quantity: number): Promise<void> {
    if (!Types.ObjectId.isValid(id) || quantity <= 0) {
      return;
    }
    await this.productModel
      .updateOne({ _id: id }, { $inc: { stock: quantity } })
      .exec();
  }

  /** Replace the full ordered images array (handles delete + reorder in one call). */
  async updateImages(id: string, images: string[]) {
    const product = await this.productModel
      .findOneAndUpdate(
        { _id: id, ...notDeletedFilter() },
        { images },
        { new: true },
      )
      .lean()
      .exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async delete(id: string) {
    const product = await this.productModel
      .findOne({ _id: id, ...notDeletedFilter() })
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
