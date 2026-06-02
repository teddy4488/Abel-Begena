import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('cart/add')
  addToCart(
    @Request() req: { user: { sub: string } },
    @Body() addToCartDto: AddToCartDto,
  ) {
    return this.orderService.addToCart(
      req.user.sub,
      addToCartDto.productId,
      addToCartDto.quantity,
    );
  }

  @Get('cart')
  getCart(@Request() req: { user: { sub: string } }) {
    return this.orderService.getCartSummary(req.user.sub);
  }

  @Post('checkout')
  checkout(
    @Request() req: { user: { sub: string } },
    @Body() checkoutDto: CheckoutDto,
  ) {
    return this.orderService.checkout(req.user.sub, checkoutDto);
  }

  @Get()
  @Roles('Admin', 'SuperAdmin')
  @UseGuards(RoleGuard)
  findAll(@Request() req: { user?: { branchId?: string } }) {
    const branchFilter = req.user?.branchId ? { branchId: req.user.branchId } : undefined;
    return this.orderService.findAll(branchFilter);
  }

  @Get('my-orders')
  getMyOrders(@Request() req: { user: { sub: string } }) {
    return this.orderService.getUserOrders(req.user.sub);
  }

  @Post(':id/cancel')
  cancelOrder(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.orderService.cancelOrder(id, req.user.sub);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'SuperAdmin';
    const order = await this.orderService.findById(
      id,
      isAdmin ? undefined : req.user.sub,
    );
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  @Patch(':id/status')
  @Roles('Admin')
  @UseGuards(RoleGuard)
  @AuditLog({ action: 'order_status', resource: 'order', resourceIdParam: 'id' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(
      id,
      updateOrderStatusDto.status,
      updateOrderStatusDto.isPaid,
      {
        trackingNumber: updateOrderStatusDto.trackingNumber,
        trackingCarrier: updateOrderStatusDto.trackingCarrier,
      },
    );
  }
}
