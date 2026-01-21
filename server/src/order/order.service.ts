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
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
    private readonly productService: ProductService,
    private readonly paymentService: PaymentService,
  ) {}

  private formatOrder(order: any) {
    const items = (order?.items ?? []).map((item: any) => {
      const populatedProduct = item?.productId && typeof item.productId === 'object'
        ? item.productId
        : null;
      const productId =
        populatedProduct?._id?.toString?.() ??
        item?.productId?.toString?.() ??
        String(item?.productId ?? '');
      const quantity = typeof item?.quantity === 'number' ? item.quantity : 0;
      const priceAtCheckout =
        typeof item?.priceAtCheckout === 'number' ? item.priceAtCheckout : 0;
      const subtotal = quantity * priceAtCheckout;
      return {
        productId,
        product: populatedProduct
          ? {
              name: populatedProduct.name,
              images: populatedProduct.images,
            }
          : null,
        quantity,
        priceAtCheckout,
        subtotal,
      };
    });

    const totalAmount =
      typeof order?.totalAmount === 'number'
        ? order.totalAmount
        : items.reduce((sum: number, it: any) => sum + (it.subtotal ?? 0), 0);

    return {
      ...order,
      _id: order?._id?.toString?.() ?? order?._id,
      user:
        order?.user && typeof order.user === 'object'
          ? {
              _id: order.user._id?.toString?.() ?? order.user._id,
              email: order.user.email,
              firstName: order.user.firstName,
              lastName: order.user.lastName,
            }
          : order?.user,
      items,
      totalAmount,
    };
  }

  async addToCart(userId: string, productId: string, quantity: number) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product id');
    }

    const userObjectId = new Types.ObjectId(userId);
    const existingCart = await this.cartModel
      .findOne({ user: userObjectId })
      .lean()
      .exec();

    const cartItems = existingCart?.items ?? [];
    const idx = cartItems.findIndex(
      (item) => item.productId.toString() === productId,
    );

    // Remove item when quantity is zero
    if (quantity === 0) {
      if (idx >= 0) {
        cartItems.splice(idx, 1);
        await this.cartModel.updateOne(
          { user: userObjectId },
          { $set: { items: cartItems } },
          { upsert: true },
        );
      }
      return this.getCartSummary(userId);
    }

    // Validate product before add/update
    const product = await this.productService.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }
    if (product.stock < Math.abs(quantity)) {
      throw new BadRequestException('Insufficient stock');
    }

    const unitPrice = this.resolveProductPrice(product);

    if (idx >= 0) {
      cartItems[idx] = {
        ...cartItems[idx],
        quantity: cartItems[idx].quantity + quantity,
        priceAtCheckout: unitPrice,
        _id:
          (cartItems[idx] as any)._id ??
          new Types.ObjectId(),
      };
      if (cartItems[idx].quantity <= 0) {
        cartItems.splice(idx, 1);
      }
    } else {
      cartItems.push({
        _id: new Types.ObjectId(),
        productId: new Types.ObjectId(productId),
        quantity,
        priceAtCheckout: unitPrice,
      });
    }

    await this.cartModel.updateOne(
      { user: userObjectId },
      { $set: { items: cartItems } },
      { upsert: true },
    );

    return this.getCartSummary(userId);
  }

  private async persistCart(cart: CartDocument) {
    if (!cart.items.length) {
      if (!cart.isNew) {
        await cart.deleteOne();
      }
      return;
    }
    // Avoid nested subdocument save edge-cases by using an atomic update.
    // This also ensures _id values in items are persisted exactly as provided.
    if (cart.isNew) {
      await cart.save();
      return;
    }
    await this.cartModel.updateOne(
      { _id: cart._id },
      { $set: { items: cart.items } },
      { runValidators: true },
    );
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
        const priceAtCheckout =
          typeof item.priceAtCheckout === 'number'
            ? item.priceAtCheckout
            : this.resolveProductPrice(product ?? { price: 0 });
        return {
          productId: item.productId,
          product: product
            ? {
              name: product.name,
              images: product.images,
            }
            : null,
          quantity: item.quantity,
          priceAtCheckout,
          subtotal: item.quantity * priceAtCheckout,
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
      .lean()
      .exec();

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const cartItems = cart.items ?? [];

    // Validate products/stock, normalize items
    const normalizedItems: Array<{
      _id: Types.ObjectId;
      productId: Types.ObjectId;
      quantity: number;
      priceAtCheckout: number;
    }> = [];
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

      const latestPrice = this.resolveProductPrice(product);
      const priceAtCheckout =
        typeof item.priceAtCheckout === 'number'
          ? item.priceAtCheckout
          : latestPrice;

      normalizedItems.push({
        _id:
          (item as any)._id
            ? new Types.ObjectId(String((item as any)._id))
            : new Types.ObjectId(),
        productId: new Types.ObjectId(item.productId),
        quantity: item.quantity,
        priceAtCheckout:
          latestPrice !== priceAtCheckout ? latestPrice : priceAtCheckout,
      });
    }

    // Calculate total
    const totalAmount = normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.priceAtCheckout,
      0,
    );

    const requiresOfflineVerification =
      checkoutDto.paymentMethod === PaymentMethod.BANK_TRANSFER ||
      checkoutDto.paymentMethod === PaymentMethod.TELEBIRR ||
      checkoutDto.paymentMethod === PaymentMethod.CBE_BIRR;

    // Require receipt for offline payments
    if (requiresOfflineVerification) {
      if (!checkoutDto.receiptUrl || typeof checkoutDto.receiptUrl !== 'string' || !checkoutDto.receiptUrl.trim()) {
        throw new BadRequestException('Receipt/confirmation is required for this payment method');
      }
    }

    let order;
    try {
      order = await this.orderModel.create({
        user: new Types.ObjectId(userId),
        items: normalizedItems,
        totalAmount,
        deliveryOption: checkoutDto.deliveryOption,
        pickupBranchId: checkoutDto.pickupBranchId
          ? new Types.ObjectId(checkoutDto.pickupBranchId)
          : undefined,
        shippingAddress: checkoutDto.shippingAddress,
        paymentMethod: checkoutDto.paymentMethod,
        status: requiresOfflineVerification
          ? OrderStatus.PAYMENT_PENDING
          : OrderStatus.PENDING,
        isPaid: false,
        receiptUrl: checkoutDto.receiptUrl,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to create order', {
        error,
        userId,
        cartItems: normalizedItems,
        deliveryOption: checkoutDto.deliveryOption,
        paymentMethod: checkoutDto.paymentMethod,
      });
      throw error;
    }

    // For offline-payment orders, create a pending payment request for admin verification.
    if (requiresOfflineVerification) {
      await this.paymentService.create(
        {
          type: 'order',
          targetId: order._id.toString(),
          amount: totalAmount,
          currency: 'ETB',
          method: checkoutDto.paymentMethod,
          reference: undefined,
          receiptUrl: checkoutDto.receiptUrl,
          reviewNote: undefined,
        },
        userId,
      );
    } else {
      // For non-bank-transfer orders (e.g. Cash on Delivery), reserve stock immediately.
      for (const item of cartItems) {
        await this.productService.reduceStock(
          item.productId.toString(),
          item.quantity,
        );
      }
    }

    // Clear cart
    await this.cartModel.deleteOne({ _id: cart._id });

    const fullOrder = await this.orderModel
      .findById(order._id)
      .populate('items.productId', 'name images')
      .lean()
      .exec();
    return this.formatOrder(fullOrder ?? order.toObject());
  }

  async findAll() {
    const orders = await this.orderModel
      .find()
      .populate('user', 'email firstName lastName')
      .populate('items.productId', 'name images')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return orders.map((o) => this.formatOrder(o));
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const order = await this.orderModel
      .findById(id)
      .populate('user', 'email firstName lastName')
      .populate('items.productId', 'name images')
      .lean()
      .exec();
    return order ? this.formatOrder(order) : null;
  }

  async updateStatus(id: string, status?: OrderStatus, isPaid?: boolean) {
    const existing = await this.orderModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    const nextStatus = status ?? existing.status;
    const nextIsPaid = typeof isPaid === 'boolean' ? isPaid : existing.isPaid;

    // Do not allow marking an order as shipped/delivered if it is not paid.
    if (
      (nextStatus === OrderStatus.SHIPPED ||
        nextStatus === OrderStatus.DELIVERED) &&
      !nextIsPaid
    ) {
      throw new BadRequestException(
        'Order must be marked as paid before it can be shipped or delivered',
      );
    }

    // Prevent un-marking an already paid order.
    if (existing.isPaid && isPaid === false) {
      throw new BadRequestException('Paid orders cannot be marked as unpaid');
    }

    existing.status = nextStatus;
    existing.isPaid = nextIsPaid;

    await existing.save();

    await existing.populate([
      { path: 'user', select: 'email firstName lastName' },
      { path: 'items.productId', select: 'name images' },
    ]);

    return this.formatOrder(existing.toObject());
  }

  async getUserOrders(userId: string) {
    const orders = await this.orderModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('items.productId', 'name images')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return orders.map((o) => this.formatOrder(o));
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
