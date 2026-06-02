import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePaymentRequestBodyDto } from './dto/create-payment-request-body.dto';
import { UpdatePaymentStatusBodyDto } from './dto/update-payment-status-body.dto';
import { SubmitStudentMonthlyPaymentDto } from './dto/submit-student-monthly-payment.dto';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // User creates a payment request (e.g., for enrollment/order/tuition)
  @Post()
  createPaymentRequest(
    @Body() dto: CreatePaymentRequestBodyDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.paymentService.create(dto, req.user.sub);
  }

  // User views their own payment requests
  @Get('me')
  getMyPaymentRequests(@Request() req: { user: { sub: string } }) {
    return this.paymentService.listForUser(req.user.sub);
  }

  // Admin: payment history with filters (status pending|approved|rejected|all, type,
  // date range, text search). Defaults to pending to preserve the approval inbox.
  @Get()
  @UseGuards(RoleGuard)
  @Roles('Admin')
  getAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
  ): Promise<unknown[]> {
    return this.paymentService.listRequests({ status, type, from, to, q });
  }

  // Admin: approve or reject a payment request
  @Post(':id/decision')
  @UseGuards(RoleGuard)
  @Roles('Admin')
  @AuditLog({ action: 'payment_decision', resource: 'payment', resourceIdParam: 'id' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdatePaymentStatusBodyDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.paymentService.updateStatus({ ...body, id }, req.user.sub);
  }

  // Admin: re-run the side effects of an already-approved payment (repair).
  @Post(':id/retry-side-effects')
  @UseGuards(RoleGuard)
  @Roles('Admin')
  @AuditLog({ action: 'payment_retry', resource: 'payment', resourceIdParam: 'id' })
  retrySideEffects(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.paymentService.retrySideEffects(id, req.user.sub);
  }

  // Student: submit monthly payment receipt
  @Post('student/monthly')
  @UseGuards(RoleGuard)
  @Roles('Student')
  submitStudentMonthlyPayment(
    @Body() dto: SubmitStudentMonthlyPaymentDto,
    @Request() req: { user: { sub: string; userType?: string } },
  ) {
    // req.user.sub is the authenticated user's ID (JWT sub); participant is resolved in service
    return this.paymentService.submitStudentMonthlyPayment(
      dto,
      req.user.sub,
    );
  }
}

