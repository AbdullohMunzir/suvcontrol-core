import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmBankPaymentDto {
  @IsString()
  @IsNotEmpty()
  abonentId: string;
}
