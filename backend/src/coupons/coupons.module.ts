import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { Coupon, CouponSchema } from './schemas/coupon.schema';
import { CouponUsage, CouponUsageSchema } from './schemas/coupon-usage.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Coupon.name, schema: CouponSchema },
      { name: CouponUsage.name, schema: CouponUsageSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  providers: [CouponsService],
  controllers: [CouponsController],
  exports: [CouponsService, MongooseModule],
})
export class CouponsModule {}
