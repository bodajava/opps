import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEmail,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ValidateCouponItem {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  subtotal?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateCouponItem)
  items?: ValidateCouponItem[];

  @IsOptional()
  @IsEmail()
  email?: string;
}
