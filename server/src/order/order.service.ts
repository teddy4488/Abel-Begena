import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus, PaymentMethod } from './schemas/order.schema';
import { Cart, CartDocument } from './schemas/cart.schema';
import { ProductService } from '../product/product.service';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
    private readonly productService: ProductService,
  ) {}

  async addToCart(userId: string, productId: string, quantity: number) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product id');
    }

    const userObjectId = new Types.ObjectId(userId);
    let cart = await this.cartModel.findOne({ user: userObjectId }).exec();

    if (!cart) {
      cart = new this.cartModel({ user: userObjectId, items: [] });
    }

    const cartItems = cart.items ?? [];
    const existingItemIndex = cartItems.findIndex(
      (item) => item.productId.toString() === productId,
    );

    // Remove item entirely when quantity is zero
    if (quantity === 0) {
      if (existingItemIndex >= 0) {
        cartItems.splice(existingItemIndex, 1);
        await this.persistCart(cart);
      }
      return this.getCartSummary(userId);
    }

    // Handle positive quantity (add/increase)
    if (quantity > 0) {
      const product = await this.productService.findById(productId);

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (!product.isActive) {
        throw new BadRequestException('Product is not available');
      }

      if (product.stock < quantity) {
        throw new BadRequestException('Insufficient stock');
      }

      const unitPrice = this.resolveProductPrice(product);

      if (existingItemIndex >= 0) {
        cartItems[existingItemIndex].quantity += quantity;
        cartItems[existingItemIndex].priceAtCheckout = unitPrice;
      } else {
        cartItems.push({
          productId: new Types.ObjectId(productId),
          quantity,
          priceAtCheckout: unitPrice,
        });
      }

      cart.items = cartItems;
      await this.persistCart(cart);
      return this.getCartSummary(userId);
    }

    // Handle negative quantity (decrease/remove)
    if (existingItemIndex === -1) {
      throw new BadRequestException('Item not found in cart');
    }

    const newQuantity = cartItems[existingItemIndex].quantity + quantity;

    if (newQuantity <= 0) {
      cartItems.splice(existingItemIndex, 1);
    } else {
      cartItems[existingItemIndex].quantity = newQuantity;
    }

    cart.items = cartItems;
    await this.persistCart(cart);
    return this.getCartSummary(userId);
  }

  private async persistCart(cart: CartDocument) {
    if (!cart.items.length) {
      if (!cart.isNew) {
        await cart.deleteOne();
      }
      return;
    }
    cart.markModified('items');
    await cart.save();
  }

  async getCartSummary(userId: string) {
    const cart = await this.cartModel
      .findOne({ user: new Types.ObjectId(userId) })
      .lean()
      .exec();
    const cartItems = cart?.items ?? [];
    const items = await Promise.all(
      cartItems.map(async (item) => {
        const product = await this.productService.findById(
          item.productId.toString(),
        );
        return {
          productId: item.productId,
          product: product
            ? {
                name: product.name,
                images: product.images,
              }
            : null,
          quantity: item.quantity,
          priceAtCheckout: item.priceAtCheckout,
          subtotal: item.quantity * item.priceAtCheckout,
        };
      }),
    );

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      items,
      totalAmount,
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  async checkout(userId: string, checkoutDto: CheckoutDto) {
    const cart = await this.cartModel
      .findOne({ user: new Types.ObjectId(userId) })
      .exec();

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const cartItems = cart.items;

    // Validate all products and stock
    for (const item of cartItems) {
      const product = await this.productService.findById(
        item.productId.toString(),
      );

      if (!product || !product.isActive) {
        const productLabel = item.productId.toString();
        throw new BadRequestException(
          `Product ${productLabel} is no longer available`,
        );
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${product.name}`,
        );
      }

      // Update price if it changed
      const latestPrice = this.resolveProductPrice(product);
      if (latestPrice !== item.priceAtCheckout) {
        item.priceAtCheckout = latestPrice;
      }
    }

    // Calculate total
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.quantity * item.priceAtCheckout,
      0,
    );

    // Create order
    const order = await this.orderModel.create({
      user: new Types.ObjectId(userId),
      items: cartItems,
      totalAmount,
      deliveryOption: checkoutDto.deliveryOption,
      pickupBranchId: checkoutDto.pickupBranchId
        ? new Types.ObjectId(checkoutDto.pickupBranchId)
        : undefined,
      shippingAddress: checkoutDto.shippingAddress,
      paymentMethod: checkoutDto.paymentMethod,
      status: OrderStatus.PENDING,
      isPaid: checkoutDto.paymentMethod === PaymentMethod.BANK_TRANSFER && !!checkoutDto.receiptUrl,
      receiptUrl: checkoutDto.receiptUrl,
    });

    // Reduce stock for all products
    for (const item of cartItems) {
      await this.productService.reduceStock(
        item.productId.toString(),
        item.quantity,
      );
    }

    // Clear cart
    await this.cartModel.deleteOne({ _id: cart._id });

    return order.toObject();
  }

  async findAll() {
    return this.orderModel
      .find()
      .populate('user', 'email firstName lastName')
      .populate('items.productId', 'name images')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    return this.orderModel
      .findById(id)
      .populate('user', 'email firstName lastName')
      .populate('items.productId', 'name images')
      .lean()
      .exec();
  }

  async updateStatus(id: string, status?: OrderStatus, isPaid?: boolean) {
    const update: Partial<Order> = {};

    if (status !== undefined) {
      update.status = status;
    }

    if (isPaid !== undefined) {
      update.isPaid = isPaid;
    }

    const order = await this.orderModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('user', 'email firstName lastName')
      .populate('items.productId', 'name images')
      .lean()
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getUserOrders(userId: string) {
    return this.orderModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('items.productId', 'name images')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  private resolveProductPrice(product: {
    price: number;
    discountPrice?: number;
    promoActive?: boolean;
  }) {
    if (product.promoActive && typeof product.discountPrice === 'number') {
      return product.discountPrice;
    }
    return product.price;
  }
}
