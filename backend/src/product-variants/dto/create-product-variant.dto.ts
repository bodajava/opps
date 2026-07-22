import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsMongoId,
  Min,
  IsObject,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductVariantDto {
  @IsMongoId()
  product: string;

  @IsString()
  name: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  salePrice?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, string>;
}
