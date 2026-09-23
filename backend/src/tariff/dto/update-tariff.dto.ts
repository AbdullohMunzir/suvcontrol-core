import { IsString, IsOptional, IsNumber, IsDateString, IsBoolean } from 'class-validator';

export class UpdateTariffDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  abonentType?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  tenantId?: string | null;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}

