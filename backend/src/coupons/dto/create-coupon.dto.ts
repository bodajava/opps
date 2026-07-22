import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  IsEnum,
  Min,
  IsMongoId,
  IsDate,
  IsNotEmpty,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AUDIENCE_TYPES } from '../audience.constants';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsEnum(['percentage', 'fixed'])
  type: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  value: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minOrderValue?: number;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  expirationDate: Date;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  perCustomerLimit?: number;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableCategories?: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFirstOrderOnly?: boolean;

  @IsOptional()
  @IsString()
  @IsEnum(AUDIENCE_TYPES)
  audience?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minOrders?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minSpent?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  inactiveDays?: number;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  customerEmails?: string[];
}
