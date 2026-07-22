import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { Campaign, CampaignSchema } from './schemas/campaign.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { EmailService } from '../common/providers/email.service';
import { CampaignQueueModule } from '../campaign-queue/campaign-queue.module';
import { UnsubscribeModule } from '../unsubscribe/unsubscribe.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    CampaignQueueModule,
    UnsubscribeModule,
  ],
  providers: [CampaignsService, EmailService],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
