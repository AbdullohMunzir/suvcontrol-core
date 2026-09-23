import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class ClickWebhookDto {
  @IsNotEmpty()
  @IsNumber()
  click_trans_id: number;

  @IsNotEmpty()
  @IsNumber()
  service_id: number;

  @IsNotEmpty()
  @IsString()
  merchant_trans_id: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsNumber()
  action: number;

  @IsNotEmpty()
  @IsNumber()
  error: number;

  @IsNotEmpty()
  @IsString()
  error_note: string;

  @IsNotEmpty()
  @IsString()
  sign_time: string;

  @IsNotEmpty()
  @IsString()
  sign_string: string;

  @IsOptional()
  merchant_prepare_id?: number | string;

  @IsOptional()
  click_paydoc_id?: number;
}
