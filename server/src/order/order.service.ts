import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CartItem } from './schemas/cart-item.schema';
import { ProductService } from '../product/product.service';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class OrderService {
  // In-memory cart storage (userId -> cart items)
  private carts: Map<string, CartItem[]> = new Map();

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly productService: ProductService,
  ) {}

  async addToCart(userId: string, productId: string, quantity: number) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product id');
    }

    const cart = this.getCart(userId);
    const existingItemIndex = cart.findIndex(
      (item) => item.productId.toString() === productId,
    );

    // Remove item entirely when quantity is zero
    if (quantity === 0) {
      if (existingItemIndex >= 0) {
        cart.splice(existingItemIndex, 1);
        this.persistCart(userId, cart);
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

      if (existingItemIndex >= 0) {
        cart[existingItemIndex].quantity += quantity;
      } else {
        cart.push({
          productId: new Types.ObjectId(productId),
          quantity,
          priceAtCheckout: product.price,
        });
      }

      this.persistCart(userId, cart);
      return this.getCartSummary(userId);
    }

    // Handle negative quantity (decrease/remove)
    if (existingItemIndex === -1) {
      throw new BadRequestException('Item not found in cart');
    }

    const newQuantity = cart[existingItemIndex].quantity + quantity;

    if (newQuantity <= 0) {
      cart.splice(existingItemIndex, 1);
    } else {
      cart[existingItemIndex].quantity = newQuantity;
    }

    this.persistCart(userId, cart);
    return this.getCartSummary(userId);
  }

  getCart(userId: string): CartItem[] {
    return this.carts.get(userId) ?? [];
  }

  private persistCart(userId: string, cart: CartItem[]) {
    if (!cart.length) {
      this.carts.delete(userId);
    } else {
      this.carts.set(userId, cart);
    }
  }

  async getCartSummary(userId: string) {
    const cart = this.getCart(userId);
    const items = await Promise.all(
      cart.map(async (item) => {
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

    const totalAmount = items.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    return {
      items,
      totalAmount,
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  async checkout(userId: string, checkoutDto: CheckoutDto) {
    const cart = this.getCart(userId);

    if (cart.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Validate all products and stock
    for (const item of cart) {
      const product = await this.productService.findById(
        item.productId.toString(),
      );

      if (!product || !product.isActive) {
        throw new BadRequestException(
          `Product ${item.productId} is no longer available`,
        );
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${product.name}`,
        );
      }

      // Update price if it changed
      if (product.price !== item.priceAtCheckout) {
        item.priceAtCheckout = product.price;
      }
    }

    // Calculate total
    const totalAmount = cart.reduce(
      (sum, item) => sum + item.quantity * item.priceAtCheckout,
      0,
    );

    // Create order
    const order = await this.orderModel.create({
      user: new Types.ObjectId(userId),
      items: cart,
      totalAmount,
      shippingAddress: checkoutDto.shippingAddress,
      paymentMethod: checkoutDto.paymentMethod,
      status: OrderStatus.PENDING,
      isPaid: false,
    });

    // Reduce stock for all products
    for (const item of cart) {
      await this.productService.reduceStock(
        item.productId.toString(),
        item.quantity,
      );
    }

    // Clear cart
    this.carts.delete(userId);

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
}
