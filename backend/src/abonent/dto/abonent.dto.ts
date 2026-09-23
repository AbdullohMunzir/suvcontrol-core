import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, Min, IsArray, ArrayMinSize, ValidateNested, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMeterDto {
  @IsString()
  @IsNotEmpty()
  number: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  certificateNumber?: string;

  @IsDateString()
  @IsNotEmpty()
  installedAt: string;

  @IsDateString()
  @IsNotEmpty()
  checkDate: string;

  @IsNumber()
  @IsOptional()
  initialReading?: number;
}

export class CreateAbonentDto {
  @IsString()
  @IsOptional()
  @IsIn(['PHYSICAL', 'LEGAL'])
  type?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'PENDING', 'SUSPENDED'])
  status?: string;

  @IsString()
  @IsOptional()
  responsiblePerson?: string;

  @IsString()
  @IsOptional()
  responsiblePhone?: string;

  @IsString()
  @IsOptional()
  bankAccount?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  mfo?: string;

  // B2B specific fields
  @IsString()
  @IsOptional()
  @IsIn(['BUDGET', 'COMMERCIAL', 'INDUSTRIAL'])
  legalCategory?: string;

  @IsString()
  @IsOptional()
  oked?: string;

  @IsBoolean()
  @IsOptional()
  vatPayer?: boolean;

  @IsString()
  @IsOptional()
  vatRegCode?: string;

  @IsString()
  @IsOptional()
  treasuryAccount?: string;

  @IsString()
  @IsOptional()
  budgetClassifier?: string;

  @IsNumber()
  @IsOptional()
  advancePaymentPercent?: number;

  @IsBoolean()
  @IsOptional()
  hasSewage?: boolean;

  @IsNumber()
  @IsOptional()
  sewageRatio?: number;

  @IsNumber()
  @IsOptional()
  pdkCoefficient?: number;

  @IsString()
  @IsOptional()
  facilityName?: string;

  @IsNumber()
  @IsOptional()
  pipeDiameterMm?: number;

  @IsNumber()
  @IsOptional()
  waterPressureBar?: number;

  @IsNumber()
  @IsOptional()
  volumeLimitM3?: number;

  @IsNumber()
  @IsOptional()
  amountLimitUzs?: number;

  @IsString()
  @IsNotEmpty()
  contractNumber: string;

  @IsDateString()
  @IsNotEmpty()
  contractDate: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  mahallaId: string;

  @IsString()
  @IsNotEmpty()
  streetId: string;

  @IsString()
  @IsNotEmpty()
  house: string;

  @IsString()
  @IsOptional()
  apartment?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  tariffId: string;

  @IsString()
  @IsOptional()
  passport?: string;

  @IsString()
  @IsOptional()
  cadastreNumber?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  familyMembers?: number;

  @IsString()
  @IsNotEmpty()
  inn: string;

  @ValidateNested()
  @Type(() => CreateMeterDto)
  @IsOptional()
  meterDetails?: CreateMeterDto;

  @IsBoolean()
  @IsOptional()
  forceCreate?: boolean;
}

export class PreviewRetroactiveDto {
  @IsDateString()
  @IsNotEmpty()
  contractDate: string;

  @IsString()
  @IsNotEmpty()
  tariffId: string;

  @IsNumber()
  @Min(1)
  familyMembers: number;
}

export class BulkActionDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CancelDebtDto {
  @IsString()
  @IsNotEmpty()
  actNumber: string;

  @IsDateString()
  @IsNotEmpty()
  actDate: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  actImageUrl: string;
}

export class ReplaceMeterDto {
  @IsString()
  @IsNotEmpty()
  oldMeterId: string;

  @IsString()
  @IsNotEmpty()
  newMeterNumber: string;

  @IsString()
  @IsOptional()
  newMeterModel?: string;

  @IsString()
  @IsOptional()
  newMeterCertificate?: string;

  @IsDateString()
  @IsNotEmpty()
  checkDate: string;

  @IsString()
  @IsNotEmpty()
  actNumber: string;

  @IsDateString()
  @IsNotEmpty()
  actDate: string;

  @IsNumber()
  oldMeterFinalReading: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class CalculateSanctionDto {
  @IsNumber()
  pipeDiameterMm: number;

  @IsNumber()
  durationHours: number;

  @IsNumber()
  @IsOptional()
  assumedVelocityMps?: number; // default 1.2 m/s

  @IsNumber()
  tariffPrice: number;
}

export class CreateSanctionDto {
  @IsString()
  @IsNotEmpty()
  abonentId: string;

  @IsString()
  @IsOptional()
  connectionPointId?: string;

  @IsString()
  @IsNotEmpty()
  actNumber: string;

  @IsDateString()
  @IsNotEmpty()
  actDate: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsNumber()
  pipeDiameterMm: number;

  @IsNumber()
  durationHours: number;

  @IsNumber()
  @IsOptional()
  assumedVelocityMps?: number;

  @IsNumber()
  tariffPrice: number;

  @IsString()
  @IsOptional()
  inspectorName?: string;
}

export class CreateLimitDto {
  @IsString()
  @IsNotEmpty()
  abonentId: string;

  @IsNumber()
  year: number;

  @IsString()
  @IsOptional()
  period?: string;

  @IsNumber()
  volumeLimitM3: number;

  @IsNumber()
  amountLimitUzs: number;

  @IsNumber()
  @IsOptional()
  warningThreshold?: number;
}

