import { IsMongoId, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(99)
  quantity: number;
}
