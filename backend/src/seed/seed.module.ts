import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedService } from './seed.service';
import { SeedCommand } from './seed.command';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import {
  ProductVariant,
  ProductVariantSchema,
} from '../product-variants/schemas/product-variant.schema';
import {
  DeliveryZone,
  DeliveryZoneSchema,
} from '../delivery-zones/schemas/delivery-zone.schema';
import {
  StoreSetting,
  StoreSettingSchema,
} from '../settings/schemas/store-setting.schema';
import { Coupon, CouponSchema } from '../coupons/schemas/coupon.schema';
import {
  PaymentMethod,
  PaymentMethodSchema,
} from '../payment-methods/schemas/payment-method.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: DeliveryZone.name, schema: DeliveryZoneSchema },
      { name: StoreSetting.name, schema: StoreSettingSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: PaymentMethod.name, schema: PaymentMethodSchema },
    ]),
  ],
  providers: [SeedService, SeedCommand],
})
export class SeedModule {}
export class SeedModuleRoot {
  static forRoot(mongodbUri: string) {
    return {
      module: SeedModuleRoot,
      imports: [
        ConfigModule.forRoot({
          envFilePath: ['.env.local', '.env'],
          isGlobal: true,
        }),
        MongooseModule.forRoot(mongodbUri),
        MongooseModule.forFeature([
          { name: Role.name, schema: RoleSchema },
          { name: User.name, schema: UserSchema },
          { name: Product.name, schema: ProductSchema },
          { name: Category.name, schema: CategorySchema },
          { name: ProductVariant.name, schema: ProductVariantSchema },
          { name: DeliveryZone.name, schema: DeliveryZoneSchema },
          { name: StoreSetting.name, schema: StoreSettingSchema },
          { name: Coupon.name, schema: CouponSchema },
          { name: PaymentMethod.name, schema: PaymentMethodSchema },
        ]),
      ],
      providers: [SeedService, SeedCommand],
    };
  }
}
