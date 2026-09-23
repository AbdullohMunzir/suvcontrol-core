import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard)
@Roles('TENANT', 'SUPERADMIN', 'OPERATOR')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  getLogs(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('tenantId') tenantId?: string,
    @Query('actionType') actionType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    const p = page ? parseInt(page) : 1;
    const l = limit ? parseInt(limit) : 20;
    return this.auditService.getLogs(
      Number.isNaN(p) ? 1 : p, 
      Number.isNaN(l) ? 20 : l, 
      tenantId, 
      actionType,
      startDate,
      endDate,
      search
    );
  }
}

