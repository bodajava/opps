import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsMongoId,
} from 'class-validator';

export class BulkUpdateProductsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsMongoId({ each: true })
  ids: string[];

  @IsBoolean()
  isActive: boolean;
}
