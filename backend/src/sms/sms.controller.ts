import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { requestContext } from '../als';
import { SmsService } from './sms.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TENANT', 'SUPERADMIN')
@Controller('sms')
export class SmsController {
  constructor(
    @InjectQueue('sms') private readonly smsQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService
  ) {}

  @Get('queue')
  async getQueue(@Query('status') status?: string) {
    const logs = await this.prisma.rlsClient.smsLog.findMany({
      where: {
        status: status || 'PENDING'
      },
      include: {
        abonent: {
          select: { fullName: true, abonentNumber: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200 // Limit for UI performance
    });

    return logs;
  }

  @Post('approve')
  async approveSms(@Body() body: { ids: string[] }) {
    const { ids } = body;
    const userId = requestContext.getStore()?.userId;

    if (!ids || ids.length === 0) return { success: true };

    const result = await this.prisma.rlsClient.smsLog.updateMany({
      where: { id: { in: ids }, status: 'PENDING' },
      data: {
        approvedBy: userId,
        approvedAt: new Date(),
        status: 'QUEUED'
      }
    });

    if (result.count > 0) {
      // Find the ones that were actually updated (status = QUEUED)
      const queuedLogs = await this.prisma.rlsClient.smsLog.findMany({
        where: { id: { in: ids }, status: 'QUEUED' }
      });

      for (const log of queuedLogs) {
        await this.smsQueue.add('sendSms', { smsLogId: log.id }, {
          attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
        });
      }
    }

    return { success: true, queuedCount: result.count };
  }

  @Post('cancel')
  async cancelSms(@Body() body: { ids: string[] }) {
    const { ids } = body;
    if (!ids || ids.length === 0) return { success: true };

    await this.prisma.rlsClient.smsLog.updateMany({
      where: { id: { in: ids }, status: 'PENDING' },
      data: { status: 'CANCELLED' }
    });

    return { success: true };
  }

  @Roles('SUPERADMIN')
  @Get('superadmin/report')
  async getSuperadminReport() {

    const adminPrisma = this.prisma.rlsClientForTenant('SUPERADMIN');
    
    // Group by tenantId and status
    const stats = await adminPrisma.smsLog.groupBy({
      by: ['tenantId', 'status'],
      _count: { _all: true }
    });

    // We also need tenant names
    const tenants = await adminPrisma.tenant.findMany({ select: { id: true, name: true } });

    // Format data
    const result = tenants.map(t => {
      const tenantStats = stats.filter(s => s.tenantId === t.id);
      return {
        tenantId: t.id,
        tenantName: t.name,
        sentCount: tenantStats.find(s => s.status === 'SENT')?._count._all || 0,
        pendingCount: tenantStats.find(s => s.status === 'PENDING')?._count._all || 0,
        failedCount: tenantStats.find(s => s.status === 'FAILED')?._count._all || 0,
        cancelledCount: tenantStats.find(s => s.status === 'CANCELLED')?._count._all || 0,
      };
    });

    return result;
  }

  @Get('balance')
  async getBalance() {
    return await this.smsService.getUserInfo();
  }

  @Post('bulk-debtors')
  async sendBulkSms(@Body() body: { abonentIds: string[], type?: 'DEBT' | 'INFO' }) {
    const { abonentIds, type = 'DEBT' } = body;
    const tenantId = requestContext.getStore()?.tenantId;
    const userId = requestContext.getStore()?.userId;
    
    if (!abonentIds || abonentIds.length === 0) return { success: true };

    const abonents = await this.prisma.abonent.findMany({
      where: { id: { in: abonentIds }, tenantId },
      include: { tenant: true }
    });

    let count = 0;
    for (const abonent of abonents) {
      if (!abonent.phone) continue;
      
      let msg = '';
      let eventType = '';

      if (type === 'DEBT') {
        const debt = Number(abonent.balance);
        if (debt <= 0) continue;
        const tenantName = abonent.tenant?.name || 'Suv Ta\'minoti';
        const cleanedTenant = tenantName.replace(/tumani/gi, '').trim().toUpperCase() + 'QISHLOQICHIMLIKSUV';
        msg = `Hurmatli ${abonent.fullName}, ${debt.toLocaleString()} so'm qarzingiz bor. Suvingiz uzilib qolmasligi uchun Click orqali to'lang. Holatni @suvcontroluz_bot yoki Click orqali tekshiring. ${cleanedTenant}`;
        eventType = 'DEBT_ALERT';
      } else if (type === 'INFO') {
        const tenantName = abonent.tenant?.name || 'Suv Ta\'minoti';
        const cleanedTenant = tenantName.replace(/tumani/gi, '').trim().toUpperCase() + 'QISHLOQICHIMLIKSUV';
        msg = `Hurmatli ${abonent.fullName}, ${cleanedTenant} mijozisiz. Raqamingiz: ${abonent.abonentNumber}. To'lov Click orqali. Hisobingizni @suvcontroluz_bot yoki Click orqali ko'rasiz.`;
        eventType = 'NEW_ABONENT'; // Can reuse NEW_ABONENT for info
      }
      
      await this.prisma.smsLog.create({
        data: {
          tenantId: tenantId!,
          abonentId: abonent.id,
          phoneNumber: abonent.phone,
          message: msg,
          eventType: eventType,
          status: 'PENDING'
        }
      });
      count++;
    }

    return { success: true, count };
  }

  @Post('sync-status')
  async syncSmsStatus() {
    const tenantId = requestContext.getStore()?.tenantId;
    const adminPrisma = this.prisma.rlsClientForTenant('SUPERADMIN');
    
    // faqat yuborilgan va externalId borlarini olamiz
    const sentLogs = await adminPrisma.smsLog.findMany({
      where: { 
        tenantId: tenantId as string,
        status: 'SENT',
        externalId: { not: null }
      },
      take: 50 // limit
    });
    
    let synced = 0;
    for (const log of sentLogs) {
      try {
        const res = await this.smsService.getSmsStatus(log.externalId as string);
        // eskiz qaytaradi: "DELIVRD", "EXPIRED", "REJECTD", ...
        const eskizStatus = res?.message?.status;
        if (eskizStatus === 'DELIVRD') {
          await adminPrisma.smsLog.update({
            where: { id: log.id },
            data: { status: 'DELIVERED' }
          });
          synced++;
        } else if (eskizStatus === 'REJECTD' || eskizStatus === 'EXPIRED' || eskizStatus === 'UNDELIV' || eskizStatus === 'ERROR') {
          await adminPrisma.smsLog.update({
            where: { id: log.id },
            data: { status: 'FAILED', errorReason: res?.message?.reason || eskizStatus }
          });
          synced++;
        }
      } catch(e) {
        // ignore single failure
      }
    }
    
    return { success: true, count: synced };
  }
}
