import { IsString, IsNotEmpty } from 'class-validator';

export class CancelPaymentDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
