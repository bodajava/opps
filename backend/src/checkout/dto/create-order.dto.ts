import {
  IsString,
  IsEmail,
  IsArray,
  IsNumber,
  IsOptional,
  IsMongoId,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  quantity: number;
}

class ShippingAddressDto {
  @IsString()
  governorate: string;

  @IsString()
  city: string;

  @IsString()
  district: string;

  @IsString()
  street: string;

  @IsString()
  buildingNumber: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}

export class CreateOrderDto {
  @IsString()
  customerName: string;

  @IsEmail()
  customerEmail: string;

  @IsString()
  customerPhone: string;

  @IsOptional()
  @IsString()
  secondaryPhone?: string;

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsString()
  verificationProof?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
