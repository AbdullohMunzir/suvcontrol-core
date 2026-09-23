import { Controller, Post, Get, Body, Query, UseGuards, Patch, Param, Delete, UsePipes, ValidationPipe, Req, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { ConfirmBankPaymentDto } from './dto/confirm-bank-payment.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Roles('TENANT', 'OPERATOR')
  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentService.create(dto);
  }

  @Roles('TENANT', 'OPERATOR')
  @Post('click/generate-link')
  generateClickLink(@Body() body: { abonentId: string; amount: number }) {
    if (!body.amount || body.amount <= 0 || body.amount > 100000000) {
      throw new BadRequestException('Notogri summa kiritildi');
    }
    return this.paymentService.generateClickLink(body.abonentId, body.amount);
  }

  @Roles('TENANT')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePaymentStatusDto) {
    return this.paymentService.updateStatus(id, dto.status);
  }

  @Roles('TENANT')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentService.updateStatus(id, 'REJECTED');
  }

  @Roles('TENANT', 'OPERATOR')
  @Get()
  getPayments(@Query('abonentId') abonentId?: string) {
    return this.paymentService.getPayments(abonentId);
  }



  @Roles('OPERATOR')
  @Get('my-today')
  getMyTodayPayments(@Req() req: any) {
    // sub holds the collectorId for OPERATOR
    return this.paymentService.getMyTodayPayments(req.user.sub);
  }

  @Roles('TENANT')
  @Post(':id/cancel')
  cancelPayment(@Param('id') id: string, @Body() dto: CancelPaymentDto) {
    return this.paymentService.cancelPayment(id, dto.reason);
  }

  @Roles('TENANT')
  @Post('bank-payments/bulk')
  bulkCreateBankPayments(@Body() body: { data: any[] }) {
    return this.paymentService.bulkCreateBankPayments(body.data);
  }

  @Roles('TENANT')
  @Get('bank-payments')
  getPendingBankPayments() {
    return this.paymentService.getPendingBankPayments();
  }

  @Roles('TENANT')
  @Post('bank-payments/:id/confirm')
  confirmBankPayment(@Param('id') id: string, @Body() dto: ConfirmBankPaymentDto) {
    return this.paymentService.confirmBankPayment(id, dto.abonentId);
  }
  @Roles('TENANT', 'OPERATOR')
  @Get(':id')
  getPaymentById(@Param('id') id: string) {
    return this.paymentService.getPaymentById(id);
  }
}
