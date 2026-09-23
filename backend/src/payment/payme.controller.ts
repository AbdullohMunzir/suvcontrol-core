import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymeService, PaymeError } from './payme.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('payments/payme')
export class PaymeController {
  constructor(
    private readonly paymeService: PaymeService,
    private readonly prisma: PrismaService
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handlePayme(
    @Body() body: any,
    @Headers('authorization') authHeader: string
  ) {
    // Basic Authentication check
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return this.sendAuthError(body.id);
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [login, password] = credentials.split(':');

    // We must find a tenant that matches the password (which is Payme Secret Key)
    // Usually login is Payme (merchant ID or 'Paycom'), and password is the secret key.
    const tenant = await this.prisma.systemClient.tenant.findFirst({
      where: {
        paymeSecretKey: password,
      },
    });

    if (!tenant) {
      return this.sendAuthError(body.id);
    }

    // Pass request to the service
    return this.paymeService.handleRequest(body, tenant.id);
  }

  private sendAuthError(id: any) {
    return {
      jsonrpc: '2.0',
      id: id || null,
      error: {
        code: -32504,
        message: {
          ru: 'Ошибка авторизации',
          uz: 'Avtorizatsiya xatosi',
          en: 'Authorization error',
        },
        data: 'Invalid credentials',
      },
    };
  }
}
