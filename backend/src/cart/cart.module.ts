import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Cart, CartSchema } from './schemas/cart.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import {
  ProductVariant,
  ProductVariantSchema,
} from '../product-variants/schemas/product-variant.schema';
import { CouponsModule } from '../coupons/coupons.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { VerifiedAccountGuard } from '../common/guards/verified-account.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: User.name, schema: UserSchema },
    ]),
    CouponsModule,
  ],
  providers: [CartService, VerifiedAccountGuard],
  controllers: [CartController],
  exports: [CartService, MongooseModule],
})
export class CartModule {}
