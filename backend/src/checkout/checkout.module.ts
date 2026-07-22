import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import {
  ProductVariant,
  ProductVariantSchema,
} from '../product-variants/schemas/product-variant.schema';
import {
  InventoryMovement,
  InventoryMovementSchema,
} from '../inventory/schemas/inventory-movement.schema';
import {
  VerificationProof,
  VerificationProofSchema,
} from '../email-verification/schemas/verification-proof.schema';
import { CouponsModule } from '../coupons/coupons.module';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';
import { EmailVerificationModule } from '../email-verification/email-verification.module';
import { PricingService } from '../common/services/pricing.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: VerificationProof.name, schema: VerificationProofSchema },
    ]),
    CouponsModule,
    DeliveryZonesModule,
    CartModule,
    OrdersModule,
    EmailVerificationModule,
  ],
  providers: [CheckoutService, PricingService],
  controllers: [CheckoutController],
})
export class CheckoutModule {}
