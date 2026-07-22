import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductVariantsService } from './product-variants.service';
import { ProductVariantsController } from './product-variants.controller';
import {
  ProductVariant,
  ProductVariantSchema,
} from './schemas/product-variant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductVariant.name, schema: ProductVariantSchema },
    ]),
  ],
  providers: [ProductVariantsService],
  controllers: [ProductVariantsController],
  exports: [ProductVariantsService, MongooseModule],
})
export class ProductVariantsModule {}
