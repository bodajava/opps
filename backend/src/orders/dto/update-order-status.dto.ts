import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsEnum([
    'pending',
    'confirmed',
    'processing',
    'ready_for_delivery',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'returned',
    'refunded',
  ])
  status: string;

  @IsOptional()
  @IsString()
  note?: string;
}
