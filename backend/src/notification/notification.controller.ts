import { Controller, Get, Post, Param, UseGuards, Request, Body, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getMyNotifications(@Request() req: any) {
    // If SUPERADMIN, maybe they see all broadcasts. Let's just pass their tenantId (which is null for superadmin)
    return this.notificationService.getMyNotifications(req.user.tenantId);
  }

  @Post(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Post('read-all')
  markAllAsRead(@Request() req: any) {
    return this.notificationService.markAllAsRead(req.user.tenantId);
  }

  @Roles('SUPERADMIN')
  @Post('broadcast')
  broadcast(@Body() data: { title: string; message: string }) {
    return this.notificationService.broadcastMessage(data.title, data.message);
  }

  @Roles('SUPERADMIN')
  @Post('send-to-tenant')
  sendToTenant(@Body() data: { tenantId: string; title: string; message: string }) {
    return this.notificationService.sendSystemNotification(data.tenantId, data.title, data.message);
  }

  @Roles('SUPERADMIN')
  @Get('admin-sent')
  getAdminSentNotifications(@Query('page') page: string, @Query('limit') limit: string) {
    const p = page ? parseInt(page) : 1;
    const l = limit ? parseInt(limit) : 20;
    return this.notificationService.getAdminSentNotifications(Number.isNaN(p) ? 1 : p, Number.isNaN(l) ? 20 : l);
  }

  @Roles('SUPERADMIN')
  @Post(':id/delete')
  deleteNotification(@Param('id') id: string) {
    return this.notificationService.deleteNotification(id);
  }
}
