import { Controller, Get, Put, Body, UseGuards, Req, Query, ForbiddenException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tenant/profile')
export class TenantProfileController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  async getProfile(@Req() req: any, @Query('tenantId') queryTenantId?: string) {
    let targetTenantId = req.user.tenantId || req.user.id;
    if (req.user.role === 'SUPERADMIN') {
      if (queryTenantId) {
        targetTenantId = queryTenantId;
      } else {
        // Return default or require tenantId
        return { message: "Superadmin tenantId parametrini yuborishi kerak" };
      }
    }
    if (!targetTenantId) {
      throw new ForbiddenException("Tashkilot aniqlanmadi");
    }
    return this.tenantService.getTenantProfile(targetTenantId);
  }

  @Put()
  async updateProfile(
    @Req() req: any,
    @Body() body: {
      name?: string;
      inn?: string;
      vatCode?: string;
      address?: string;
      phone?: string;
      email?: string;
      bankAccount?: string;
      bankName?: string;
      mfo?: string;
      directorName?: string;
      accountantName?: string;
      tenantId?: string;
    }
  ) {
    let targetTenantId = req.user.tenantId || req.user.id;
    if (req.user.role === 'SUPERADMIN' && body.tenantId) {
      targetTenantId = body.tenantId;
    }
    if (!targetTenantId) {
      throw new ForbiddenException("Tashkilot aniqlanmadi");
    }
    return this.tenantService.updateTenantProfile(targetTenantId, body);
  }
}
