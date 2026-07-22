import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  reference: string;

  @IsString()
  @IsOptional()
  provider?: string;
}
