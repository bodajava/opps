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

export enum CategorySortField {
  NAME = 'name',
  SORT_ORDER = 'sortOrder',
  CREATED_AT = 'createdAt',
}

export class QueryCategoriesDto {
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
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsMongoId()
  parent?: string;

  @IsOptional()
  @IsEnum(CategorySortField)
  sort?: CategorySortField;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;
}
