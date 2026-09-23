import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TENANT', 'SUPERADMIN')
@Controller('collections')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get('debtors')
  getDebtors(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('minDebt') minDebt: string,
    @Query('debtDuration') debtDuration: string
  ) {
    const p = page ? parseInt(page) : 1;
    const l = limit ? parseInt(limit) : 20;
    const debt = minDebt ? parseFloat(minDebt) : 0;
    
    return this.collectionService.getDebtors(
      Number.isNaN(p) ? 1 : p,
      Number.isNaN(l) ? 20 : l,
      search,
      Number.isNaN(debt) ? 0 : debt,
      debtDuration
    );
  }

  @Get(':abonentId/history')
  getHistory(@Param('abonentId') abonentId: string) {
    return this.collectionService.getHistory(abonentId);
  }

  @Post(':abonentId/action')
  addAction(
    @Param('abonentId') abonentId: string,
    @Body() data: { actionType: string; notes: string },
    @Request() req: any
  ) {
    return this.collectionService.addAction(
      abonentId,
      data.actionType,
      data.notes,
      req.user.id || 'unknown'
    );
  }
}
