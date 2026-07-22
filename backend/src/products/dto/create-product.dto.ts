import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  Min,
  IsMongoId,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  fullDescription?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsOptional()
  @IsMongoId()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  regularPrice: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  salePrice?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  costPrice?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  stock: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  lowStockThreshold?: number;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsOptional()
  ingredients?: string;

  @IsString()
  @IsOptional()
  allergens?: string;

  @IsString()
  @IsOptional()
  nutritionalNotes?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  weight?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  cookieCount?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sizes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  flavors?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  packagingOptions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  estimatedPrepTime?: number;
}
