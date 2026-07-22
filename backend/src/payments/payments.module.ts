import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import {
  PaymentEvent,
  PaymentEventSchema,
} from './schemas/payment-event.schema';
import { PaymentRegistryService } from './payment-registry.service';
import { CodProvider } from './providers/cod.provider';
import { PaymobProvider } from './providers/paymob.provider';
import { FawryProvider } from './providers/fawry.provider';
import { ManualWalletProvider } from './providers/manual-wallet.provider';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentEvent.name, schema: PaymentEventSchema },
    ]),
    OrdersModule,
  ],
  providers: [
    PaymentsService,
    PaymentRegistryService,
    CodProvider,
    PaymobProvider,
    FawryProvider,
    ManualWalletProvider,
  ],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaymentRegistryService],
})
export class PaymentsModule {}
