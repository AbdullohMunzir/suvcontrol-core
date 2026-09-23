import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentService } from './payment.service';

import { ClickWebhookDto } from './dto/click-webhook.dto';

@Controller('payments/click')
export class ClickController {
  constructor(private readonly paymentService: PaymentService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  async handleWebhook(@Body() body: any) {
    return this.paymentService.handleClickWebhook(body);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('info')
  async handleInfoPost(@Body() body: any) {
    return this.paymentService.handleClickAdvanced(body);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('info')
  async handleInfoGet(@Query() query: any) {
    return this.paymentService.handleClickInfo(query);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('advanced')
  async handleAdvancedPost(@Body() body: any) {
    return this.paymentService.handleClickAdvanced(body);
  }

  @Get('debug')
  getDebugLogs() {
    return this.paymentService.getDebugLogs();
  }
}
