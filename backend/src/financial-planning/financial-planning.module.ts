import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialPlanningService } from './financial-planning.service';
import { FinancialPlanningController } from './financial-planning.controller';
import {
  FinancialSetting,
  FinancialSettingSchema,
} from './schemas/financial-setting.schema';
import {
  ExpenseRecord,
  ExpenseRecordSchema,
} from './schemas/expense-record.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FinancialSetting.name, schema: FinancialSettingSchema },
      { name: ExpenseRecord.name, schema: ExpenseRecordSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  providers: [FinancialPlanningService],
  controllers: [FinancialPlanningController],
  exports: [FinancialPlanningService],
})
export class FinancialPlanningModule {}
