import {  Controller, Get, Post, Body, UseGuards, Req, Patch, Delete, Param, UsePipes, ValidationPipe, Logger , ForbiddenException } from '@nestjs/common';
import { TariffService } from './tariff.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateTariffDto } from './dto/update-tariff.dto';

@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('superadmin/tariffs')
export class TariffController {
  private readonly logger = new Logger(TariffController.name);
  constructor(private readonly tariffService: TariffService) {}

  @Post()
  create(@Body() body: any, @Req() req: any) {
    if (req.user?.role !== 'SUPERADMIN') throw new ForbiddenException('Forbidden');
    return this.tariffService.create(body);
  }

  @Get()
  findAll() {
    return this.tariffService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateTariffDto, @Req() req: any) {
    if (req.user?.role !== 'SUPERADMIN') throw new ForbiddenException('Forbidden');
    this.logger.log(`Tariff ${id} updated by ${req.user?.id}`);
    return this.tariffService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    if (req.user?.role !== 'SUPERADMIN') throw new ForbiddenException('Forbidden');
    return this.tariffService.remove(id);
  }
}
