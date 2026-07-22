import { IsMongoId, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @IsMongoId()
  itemId: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(99)
  quantity: number;
}
