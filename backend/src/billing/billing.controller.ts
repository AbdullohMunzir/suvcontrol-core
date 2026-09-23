import {  Controller, Post, Get, Body, Query, UseGuards, Param, Res , BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { CronService } from '../cron/cron.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TENANT', 'SUPERADMIN')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('generate')
  generate(@Body('period') period: string) {
    if (!period) throw new BadRequestException('Period is required');
    return this.billingService.generateBillingForPeriod(period);
  }

  @Get('invoices')
  getInvoices(@Query('period') period?: string) {
    return this.billingService.getInvoices(period);
  }

  @Get('invoice/:id/pdf')
  async downloadInvoicePdf(@Param('id') id: string, @Res() res: any) {
    const pdfBytes = await this.billingService.generateInvoicePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice-${id}.pdf`,
      'Content-Length': pdfBytes.length,
    });
    res.end(pdfBytes);
  }
}
