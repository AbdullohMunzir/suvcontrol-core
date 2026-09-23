import { Controller, Post, Get, Body, Param, UseGuards, Delete, Patch } from '@nestjs/common';
import { MeterService } from './meter.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('meters')
export class MeterController {
  constructor(private readonly meterService: MeterService) {}

  @Roles('TENANT')
  @Post()
  createMeter(@Body() body: any) {
    return this.meterService.createMeter(body);
  }

  @Roles('TENANT', 'OPERATOR', 'COLLECTOR')
  @Get('abonent/:abonentId')
  getMetersByAbonent(@Param('abonentId') abonentId: string) {
    return this.meterService.getMetersByAbonent(abonentId);
  }

  @Roles('TENANT', 'OPERATOR', 'COLLECTOR')
  @Post('readings')
  addReading(@Body() body: any) {
    return this.meterService.addReading(body);
  }

  @Roles('TENANT', 'OPERATOR', 'COLLECTOR')
  @Get(':id/readings')
  getReadings(@Param('id') id: string) {
    return this.meterService.getReadings(id);
  }

  @Roles('TENANT')
  @Delete(':id')
  deleteMeter(@Param('id') id: string) {
    return this.meterService.deleteMeter(id);
  }

  @Roles('TENANT')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.meterService.updateStatus(id, status);
  }

  @Roles('TENANT')
  @Post('replace')
  replaceMeter(@Body() body: any) {
    return this.meterService.replaceMeter(body);
  }

  @Roles('TENANT', 'OPERATOR')
  @Post('certificate-refresh')
  refreshCertificate(@Body() body: any) {
    return this.meterService.replaceMeter(body);
  }

  @Post('bulk-readings')
  addBulkReadings(@Body() body: { readings: { subscriberId: string, reading: number, date: string }[] }) {
    return this.meterService.addBulkReadings(body.readings);
  }
}
