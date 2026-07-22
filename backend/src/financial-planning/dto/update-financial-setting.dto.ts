import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialSettingType } from '../schemas/financial-setting.schema';

export class UpdateFinancialSettingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  value: number;

  @ApiProperty({ enum: FinancialSettingType })
  @IsEnum(FinancialSettingType)
  @IsNotEmpty()
  type: FinancialSettingType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
