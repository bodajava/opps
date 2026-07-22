import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsMongoId,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsOptional()
  @IsMongoId()
  parent?: string;
}
