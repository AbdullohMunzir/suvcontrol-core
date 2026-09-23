import { Controller, Post, Get, Body, Param, UseGuards, Patch, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { CollectorService } from './collector.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateCollectorDto, UpdateCollectorStatusDto, TogglePrinterDto, ResetPasswordDto, UpdateCollectorDto } from './dto/collector.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TENANT')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('collectors')
export class CollectorController {
  constructor(private readonly collectorService: CollectorService) {}

  @Post()
  createCollector(@Body() dto: CreateCollectorDto) {
    return this.collectorService.createCollector(dto);
  }

  @Get()
  getCollectors() {
    return this.collectorService.getCollectors();
  }

  @Patch(':id')
  updateCollector(@Param('id') id: string, @Body() dto: UpdateCollectorDto) {
    return this.collectorService.updateCollector(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateCollectorStatusDto) {
    return this.collectorService.updateStatus(id, dto.status);
  }

  @Patch(':id/printer')
  togglePrinter(@Param('id') id: string, @Body() dto: TogglePrinterDto) {
    return this.collectorService.togglePrinter(id, dto.printerEnabled);
  }

  @Patch(':id/password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.collectorService.resetPassword(id, dto.passwordRaw);
  }

  @Delete(':id')
  deleteCollector(@Param('id') id: string) {
    return this.collectorService.deleteCollector(id);
  }
}

