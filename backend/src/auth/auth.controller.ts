import {  Body, Controller, Post, HttpCode, HttpStatus, Res, Req, Get, UseGuards, Logger, UsePipes, ValidationPipe , BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
import { LoginDto, RefreshDto, ChangePasswordDto } from './dto/auth.dto';

@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() signInDto: LoginDto, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.login(signInDto);

    res.cookie('access_token', result.access_token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: signInDto.clientType === 'mobile' ? 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000,
    });

    const refreshOptions: any = {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    };
    if (signInDto.rememberMe) {
      refreshOptions.maxAge = 7 * 24 * 60 * 60 * 1000;
    }

    res.cookie('refresh_token', result.refresh_token, refreshOptions);

    return result;
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const result = await this.authService.refresh(refreshToken);

    res.cookie('access_token', result.access_token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 12 * 60 * 60 * 1000,
    });

    if (result.refresh_token) {
      const refreshOptions: any = {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      };
      if (result.rememberMe) {
        refreshOptions.maxAge = 7 * 24 * 60 * 60 * 1000;
      }

      res.cookie('refresh_token', result.refresh_token, refreshOptions);
    }

    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: any) {
    const cookieOptions = { path: '/', httpOnly: true, secure: true, sameSite: 'none' as const };
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    return req.user;
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Req() req: any, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, req.user.role, body.oldPasswordRaw, body.newPasswordRaw);
  }
}
