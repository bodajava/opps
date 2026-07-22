import { IsOptional, IsString } from 'class-validator';
import { SettingValue } from '../types/setting-value.type';

export class UpdateSettingDto {
  @IsString()
  @IsOptional()
  key?: string;

  value: SettingValue;

  @IsString()
  @IsOptional()
  group?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
