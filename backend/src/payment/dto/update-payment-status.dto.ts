import { IsString, IsIn } from 'class-validator';

export class UpdatePaymentStatusDto {
  @IsString()
  @IsIn(['ACCEPTED', 'REJECTED', 'CANCELLED'])
  status: string;
}
