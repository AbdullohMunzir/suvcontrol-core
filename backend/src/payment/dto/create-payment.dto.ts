import { IsString, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  abonentId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsOptional()
  receiptNumber?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  collectorId?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;
}
