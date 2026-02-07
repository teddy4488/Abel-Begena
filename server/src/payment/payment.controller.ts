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
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { SubmitStudentMonthlyPaymentDto } from './dto/submit-student-monthly-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // User creates a payment request (e.g., for enrollment/order/tuition)
  @Post()
  createPaymentRequest(
    @Body() dto: Omit<CreatePaymentRequestDto, 'userId'>,
    @Request() req: { user: { sub: string } },
  ) {
    return this.paymentService.create(dto, req.user.sub);
  }

  // User views their own payment requests
  @Get('me')
  getMyPaymentRequests(@Request() req: { user: { sub: string } }) {
    return this.paymentService.listForUser(req.user.sub);
  }

  // Admin: list pending or filtered payment requests
  @Get()
  @UseGuards(RoleGuard)
  @Roles('Admin')
  getAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    if (status && status !== 'pending') {
      // For now we only support listing pending; can be extended later
      return this.paymentService.listPending(type);
    }
    return this.paymentService.listPending(type);
  }

  // Admin: approve or reject a payment request
  @Post(':id/decision')
  @UseGuards(RoleGuard)
  @Roles('Admin')
  @AuditLog({ action: 'payment.updateStatus', resource: 'PaymentRequest', resourceIdParam: 'id' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: Omit<UpdatePaymentStatusDto, 'id'>,
    @Request() req: { user: { sub: string } },
  ) {
    return this.paymentService.updateStatus(
      { ...body, id },
      req.user.sub,
    );
  }

  // Student: submit monthly payment receipt
  @Post('student/monthly')
  @UseGuards(JwtAuthGuard)
  submitStudentMonthlyPayment(
    @Body() dto: SubmitStudentMonthlyPaymentDto,
    @Request() req: { user: { sub: string; userType?: string } },
  ) {
    // For students, req.user.sub is their student participant ID
    return this.paymentService.submitStudentMonthlyPayment(
      dto,
      req.user.sub,
    );
  }
}

