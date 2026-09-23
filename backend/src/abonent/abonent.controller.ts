import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { AbonentService } from './abonent.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateAbonentDto } from './dto/update-abonent.dto';
import { CreateAbonentDto, PreviewRetroactiveDto, BulkActionDto, CancelDebtDto, ReplaceMeterDto, CreateSanctionDto, CalculateSanctionDto, CreateLimitDto } from './dto/abonent.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('abonents')
export class AbonentController {
  constructor(private readonly abonentService: AbonentService) {}

  @Roles('TENANT')
  @Post()
  create(@Body() body: CreateAbonentDto) {
    return this.abonentService.create(body);
  }

  @Roles('TENANT')
  @Post('preview-retroactive')
  previewRetroactive(@Body() body: PreviewRetroactiveDto) {
    return this.abonentService.previewRetroactive(body);
  }

  @Roles('TENANT', 'OPERATOR')
  @Get('search')
  search(@Query('q') q: string) {
    if (!q) return [];
    return this.abonentService.search(q);
  }

  @Roles('TENANT', 'OPERATOR')
  @Get()
  findAll(
    @Query('page') page: string, 
    @Query('limit') limit: string, 
    @Query('search') search: string, 
    @Query('status') status: string,
    @Query('mahallaId') mahallaId: string,
    @Query('streetId') streetId: string,
    @Query('hasDebt') hasDebt: string,
    @Query('tariffType') tariffType: string,
    @Query('type') type: string,
    @Query('debtDuration') debtDuration: string
  ) {
    const p = page ? parseInt(page) : 1;
    const l = limit ? parseInt(limit) : 20;
    const enforcedType = type || 'PHYSICAL'; // Strict default
    return this.abonentService.findAll(Number.isNaN(p) ? 1 : p, Number.isNaN(l) ? 20 : l, search, status, mahallaId, streetId, hasDebt, tariffType, enforcedType, debtDuration);
  }

  @Roles('TENANT', 'OPERATOR')
  @Get('legal-entities')
  findLegalEntities(
    @Query('page') page: string, 
    @Query('limit') limit: string, 
    @Query('search') search: string, 
    @Query('category') category: string,
    @Query('hasDebt') hasDebt: string,
    @Query('limitRisk') limitRisk: string,
  ) {
    const p = page ? parseInt(page) : 1;
    const l = limit ? parseInt(limit) : 50;
    return this.abonentService.findLegalEntities({
      page: Number.isNaN(p) ? 1 : p,
      limit: Number.isNaN(l) ? 50 : l,
      search,
      category,
      hasDebt,
      limitRisk
    });
  }

  @Roles('TENANT', 'OPERATOR')
  @Post('calculate-sanction')
  calculateSanction(@Body() dto: CalculateSanctionDto) {
    return this.abonentService.calculateSanction(dto);
  }

  @Roles('TENANT')
  @Post('sanctions')
  createSanctionAct(@Body() dto: CreateSanctionDto) {
    return this.abonentService.createSanctionAct(dto);
  }

  @Roles('TENANT', 'OPERATOR')
  @Get(':id/akt-sverka')
  getAktSverka(@Param('id') id: string, @Query('year') year?: string) {
    return this.abonentService.getAktSverka(id, year ? parseInt(year) : undefined);
  }

  @Roles('TENANT')
  @Post(':id/limits')
  setAbonentLimit(@Param('id') id: string, @Body() dto: CreateLimitDto) {
    dto.abonentId = id;
    return this.abonentService.setAbonentLimit(dto);
  }

  @Roles('TENANT', 'OPERATOR')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.abonentService.findOne(id);
  }

  @Roles('TENANT')
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateAbonentDto) {
    return this.abonentService.update(id, data);
  }

  @Roles('TENANT')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.abonentService.updateStatus(id, status);
  }

  @Roles('TENANT')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.abonentService.remove(id);
  }

  @Roles('TENANT', 'OPERATOR')
  @Post(':id/cancel-debt')
  cancelDebt(@Param('id') id: string, @Body() data: any) {
    return this.abonentService.cancelDebt(id, data);
  }

  @Roles('TENANT', 'OPERATOR')
  @Post(':id/manual-charge')
  manualCharge(@Param('id') id: string, @Body() data: { amount: number; reason: string }) {
    return this.abonentService.manualCharge(id, data);
  }

  @Roles('TENANT')
  @Post('bulk-archive')
  bulkArchive(@Body() body: BulkActionDto) {
    return this.abonentService.bulkArchive(body.ids, body.reason);
  }

  @Roles('TENANT')
  @Post('bulk-unarchive')
  bulkUnarchive(@Body() body: BulkActionDto) {
    return this.abonentService.bulkUnarchive(body.ids, body.reason);
  }
}
