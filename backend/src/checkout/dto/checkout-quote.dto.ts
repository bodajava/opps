import {
  IsArray,
  IsString,
  IsOptional,
  IsMongoId,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class QuoteItemDto {
  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  quantity: number;
}

export class CheckoutQuoteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsString()
  governorate: string;

  @IsString()
  city: string;
}
