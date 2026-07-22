import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDeliveryZoneDto {
  @IsString()
  governorate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  deliveryFee: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  freeDeliveryThreshold?: number;

  @IsOptional()
  @IsString()
  estimatedDeliveryDays?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  codAvailable?: boolean;
}
