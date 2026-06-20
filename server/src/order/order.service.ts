import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderStatus,
  PaymentMethod,
  isStockReserved,
} from './schemas/order.schema';
import { Cart, CartDocument } from './schemas/cart.schema';
import { ProductService } from '../product/product.service';
import { CheckoutDto } from './dto/checkout.dto';
import { PaymentService } from '../payment/payment.service';
import { notDeletedFilter } from '../common/filters/not-deleted.filter';
import { MailService } from '../mail/mail.service';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
    private readonly productService: ProductService,
    private readonly paymentService: PaymentService,
    private readonly mailService: MailService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * After stock has been reduced, notify all admins ONLY when this reduction
   * crossed the low-stock threshold (so admins aren't spammed on every order
   * while a product sits below threshold). Best-effort; never blocks the order.
   */
  private async maybeNotifyLowStock(
    product: {
      _id?: unknown;
      name?: string;
      stock?: number;
      lowStockThreshold?: number;
    },
    reducedBy: number,
  ): Promise<void> {
    try {
      const threshold = product?.lowStockThreshold ?? 0;
      const stock = product?.stock ?? 0;
      const previousStock = stock + reducedBy;
      // Only fire on the transition from above-threshold to at/below-threshold.
      if (threshold <= 0 || stock > threshold || previousStock <= threshold) {
        return;
      }
      const admins = await this.userService.findAdmins();
      await Promise.all(
        admins.map((admin) => {
          const adminId = (admin as { _id?: { toString: () => string } })._id?.toString();
          if (!adminId) return Promise.resolve();
          return this.notificationService
            .createForUser(adminId, {
              type: 'low_stock',
              title: 'Low stock alert',
              message: `${product.name ?? 'A product'} is low on stock (${stock} left).`,
              data: { productId: product._id, stock, threshold },
            })
            .catch(() => undefined);
        }),
      );
    } catch {
      // best-effort; never block the order flow
    }
  }

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
      const snapshotName =
        typeof item?.productName === 'string' ? item.productName : undefined;
      return {
        productId,
        productName: snapshotName ?? populatedProduct?.name ?? null,
        product: populatedProduct
          ? {
              name: populatedProduct.name,
              images: populatedProduct.images,
            }
          : snapshotName
            ? { name: snapshotName, images: [] }
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
              phone: order.user.phone,
            }
          : order?.user,
      pickupBranchId:
        order?.pickupBranchId && typeof order.pickupBranchId === 'object'
          ? {
              _id:
                order.pickupBranchId._id?.toString?.() ??
                order.pickupBranchId._id,
              name: order.pickupBranchId.name,
              address: order.pickupBranchId.address,
              city: order.pickupBranchId.city,
              region: order.pickupBranchId.region,
            }
          : order?.pickupBranchId,
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
    // Validate the PROJECTED cart quantity (existing + delta), not just the delta,
    // so the cart can never hold more units than are in stock.
    const existingQty = idx >= 0 ? cartItems[idx].quantity : 0;
    const projectedQty = existingQty + quantity;
    if (projectedQty > product.stock) {
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
      productName: string;
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
        productName: product.name,
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
        const updatedProduct = await this.productService.reduceStock(
          item.productId.toString(),
          item.quantity,
        );
        await this.maybeNotifyLowStock(updatedProduct, item.quantity);
      }
    }

    // Clear cart
    await this.cartModel.deleteOne({ _id: cart._id });

    // Send order confirmation email
    try {
      const user = await this.userService.findById(userId);
      if (user?.email) {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined;
        await this.mailService.sendOrderConfirmationEmail(
          user.email,
          fullName ?? '',
          order._id.toString(),
          totalAmount,
          'ETB',
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to send order confirmation email:', e);
    }

    const fullOrder = await this.orderModel
      .findById(order._id)
      .populate('items.productId', 'name images')
      .lean()
      .exec();
    return this.formatOrder(fullOrder ?? order.toObject());
  }

  /** Phase 5.3: optional branchId filters by pickupBranchId (Admin branch scope). */
  async findAll(branchFilter?: { branchId: string }) {
    const base = notDeletedFilter();
    const filter =
      branchFilter?.branchId && Types.ObjectId.isValid(branchFilter.branchId)
        ? { ...base, pickupBranchId: new Types.ObjectId(branchFilter.branchId) }
        : base;
    const orders = await this.orderModel
      .find(filter)
      .populate('user', 'email firstName lastName phone')
      .populate('items.productId', 'name images')
      .populate('pickupBranchId', 'name address city region')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return orders.map((o) => this.formatOrder(o));
  }

  /**
   * Fetch a single order. When `requestingUserId` is provided, the order must
   * belong to that user (ownership enforcement for non-admin callers).
   */
  async findById(id: string, requestingUserId?: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const filter: Record<string, unknown> = {
      _id: new Types.ObjectId(id),
      ...notDeletedFilter(),
    };
    if (requestingUserId && Types.ObjectId.isValid(requestingUserId)) {
      filter.user = new Types.ObjectId(requestingUserId);
    }

    const order = await this.orderModel
      .findOne(filter)
      .populate('user', 'email firstName lastName phone')
      .populate('items.productId', 'name images')
      .populate('pickupBranchId', 'name address city region')
      .lean()
      .exec();
    return order ? this.formatOrder(order) : null;
  }

  async updateStatus(
    id: string,
    status?: OrderStatus,
    isPaid?: boolean,
    tracking?: { trackingNumber?: string; trackingCarrier?: string },
  ) {
    const existing = await this.orderModel
      .findOne({ _id: new Types.ObjectId(id), ...notDeletedFilter() })
      .exec();
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

    // Strict forward-only fulfillment progression. Once an order is delivered it's
    // final; once shipped it can only go to delivered or cancelled; etc. Cancellation
    // is always allowed (from any non-terminal state) — that's a separate workflow.
    if (status && status !== existing.status) {
      const allowedNext: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PAYMENT_PENDING]: [OrderStatus.PAYMENT_REJECTED, OrderStatus.PROCESSING, OrderStatus.CANCELLED],
        [OrderStatus.PAYMENT_REJECTED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
        [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
        [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
        // Shipped → only Delivered. Once it's with the carrier the items are no
        // longer in our inventory; "cancelling" wouldn't be honest about state.
        [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
        [OrderStatus.DELIVERED]: [], // terminal
        [OrderStatus.CANCELLED]: [], // terminal
      };
      const allowed = allowedNext[existing.status as OrderStatus] ?? [];
      if (!allowed.includes(status)) {
        throw new BadRequestException(
          `Cannot move order from "${existing.status}" to "${status}". Allowed next states: ${allowed.join(', ') || '(none — order is in a terminal state)'}.`,
        );
      }
    }

    // Restore stock when cancelling an order that currently holds reserved stock.
    if (
      nextStatus === OrderStatus.CANCELLED &&
      isStockReserved(existing.status)
    ) {
      for (const item of existing.items ?? []) {
        await this.productService.restoreStock(
          item.productId.toString(),
          item.quantity,
        );
      }
    }

    existing.status = nextStatus;
    existing.isPaid = nextIsPaid;

    if (typeof tracking?.trackingNumber === 'string') {
      existing.trackingNumber = tracking.trackingNumber;
    }
    if (typeof tracking?.trackingCarrier === 'string') {
      existing.trackingCarrier = tracking.trackingCarrier;
    }

    await existing.save();

    await existing.populate([
      { path: 'user', select: 'email firstName lastName phone' },
      { path: 'items.productId', select: 'name images' },
      { path: 'pickupBranchId', select: 'name address city region' },
    ]);

    // Notify the customer when the order status changes
    try {
      const user: any = existing.user;
      if (user?.email) {
        const fullName =
          [user.firstName, user.lastName].filter(Boolean).join(' ') || '';
        await this.mailService.sendOrderStatusUpdatedEmail(
          user.email,
          fullName,
          existing._id.toString(),
          existing.status,
          existing.isPaid,
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to send order status updated email:', e);
    }

    return this.formatOrder(existing.toObject());
  }

  async getUserOrders(userId: string) {
    const orders = await this.orderModel
      .find({ user: new Types.ObjectId(userId), ...notDeletedFilter() })
      .populate('items.productId', 'name images')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return orders.map((o) => this.formatOrder(o));
  }

  /**
   * Customer-initiated cancellation. Ownership is enforced by the query.
   * Only orders that are still Pending (COD) or PaymentPending (offline) may
   * be cancelled by the customer. Stock is restored only when it was reserved.
   */
  async cancelOrder(orderId: string, userId: string) {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException('Order not found');
    }
    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        user: new Types.ObjectId(userId),
        ...notDeletedFilter(),
      })
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PAYMENT_PENDING
    ) {
      throw new BadRequestException(
        'Only pending orders can be cancelled. Please contact support for assistance.',
      );
    }

    // Restore stock only if it was reserved (COD orders reserve at checkout).
    if (isStockReserved(order.status)) {
      for (const item of order.items ?? []) {
        await this.productService.restoreStock(
          item.productId.toString(),
          item.quantity,
        );
      }
    }

    order.status = OrderStatus.CANCELLED;
    await order.save();

    await order.populate([
      { path: 'items.productId', select: 'name images' },
      { path: 'pickupBranchId', select: 'name address city region' },
    ]);

    return this.formatOrder(order.toObject());
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
