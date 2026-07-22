import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Home' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Cairo' })
  @IsString()
  @MinLength(2)
  governorate: string;

  @ApiProperty({ example: 'New Cairo' })
  @IsString()
  @MinLength(2)
  city: string;

  @ApiProperty({ example: 'Fifth Settlement' })
  @IsString()
  @MinLength(2)
  district: string;

  @ApiProperty({ example: '90th Street' })
  @IsString()
  @MinLength(2)
  street: string;

  @ApiPropertyOptional({ example: '12' })
  @IsOptional()
  @IsString()
  buildingNumber?: string;

  @ApiPropertyOptional({ example: '3' })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({ example: '51' })
  @IsOptional()
  @IsString()
  apartment?: string;

  @ApiPropertyOptional({ example: 'Near Mosque' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional({ example: 'Leave at the door' })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
