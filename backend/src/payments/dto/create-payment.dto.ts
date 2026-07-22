import { IsMongoId, IsString, IsNotEmpty } from 'class-validator';

export class CreatePaymentDto {
  @IsMongoId()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
