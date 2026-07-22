import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import {
  InventoryMovement,
  InventoryMovementSchema,
} from './schemas/inventory-movement.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import {
  ProductVariant,
  ProductVariantSchema,
} from '../product-variants/schemas/product-variant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
    ]),
  ],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService, MongooseModule],
})
export class InventoryModule {}
