import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  Min,
  IsDate,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  CampaignAudienceType,
  CampaignStatus,
} from '../schemas/campaign.schema';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsOptional()
  @IsString()
  preheader?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  senderEmail?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['draft', 'scheduled', 'sending', 'sent', 'cancelled'])
  status?: CampaignStatus;

  @IsOptional()
  @IsString()
  @IsEnum([
    'all',
    'new_customers',
    'returning',
    'high_value',
    'inactive',
    'specific',
  ])
  audience?: CampaignAudienceType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minOrders?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minSpent?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  inactiveDays?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerEmails?: string[];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledAt?: Date;
}
