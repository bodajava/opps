import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import {
  InventoryMovement,
  InventoryMovementSchema,
} from '../inventory/schemas/inventory-movement.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import {
  ProductVariant,
  ProductVariantSchema,
} from '../product-variants/schemas/product-variant.schema';
import { Counter, CounterSchema } from '../common/schemas/counter.schema';
import { OrderNumberHelper } from '../common/helpers/order-number.helper';
import { EmailService } from '../common/providers/email.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  providers: [OrdersService, OrderNumberHelper, EmailService],
  controllers: [OrdersController],
  exports: [OrdersService, MongooseModule],
})
export class OrdersModule {}
