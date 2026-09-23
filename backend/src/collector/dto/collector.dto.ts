import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateCollectorDto {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  passwordRaw: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class UpdateCollectorStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class TogglePrinterDto {
  @IsBoolean()
  printerEnabled: boolean;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  passwordRaw: string;
}

export class UpdateCollectorDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  passwordRaw?: string;
}

