import { IsString, IsNotEmpty, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  login?: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  clientType?: string;

  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}

export class RefreshDto {
  @IsString()
  @IsOptional()
  refresh_token?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPasswordRaw: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" })
  newPasswordRaw: string;
}
