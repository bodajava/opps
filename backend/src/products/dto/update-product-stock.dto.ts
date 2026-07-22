import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductStockDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;
}
