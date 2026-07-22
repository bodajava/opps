import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { SortOrder } from '../../common/dto/pagination.dto';

export enum InventoryStatusFilter {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
}

export enum InventorySortField {
  NAME = 'name',
  SKU = 'sku',
  STOCK = 'stock',
  UPDATED_AT = 'updatedAt',
}

export class QueryInventoryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(InventoryStatusFilter)
  status?: InventoryStatusFilter;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lowStock?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  outOfStock?: boolean;

  @IsOptional()
  @IsMongoId()
  category?: string;

  @IsOptional()
  @IsEnum(InventorySortField)
  sort?: InventorySortField;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;
}
