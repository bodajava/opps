import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { CampaignQueueService } from './campaign-queue.service';
import { CampaignQueueProcessor } from './campaign-queue.processor';
import { Campaign, CampaignSchema } from '../campaigns/schemas/campaign.schema';
import { EmailService } from '../common/providers/email.service';

const campaignQueueEnabled = process.env.EMAIL_QUEUE_ENABLED === 'true';

@Module({
  imports: [
    ...(campaignQueueEnabled
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
              connection: { url: configService.get<string>('app.redisUrl') },
              defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: 100,
                removeOnFail: 50,
              },
            }),
            inject: [ConfigService],
          }),
          BullModule.registerQueueAsync({ name: 'campaign' }),
        ]
      : []),
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
    ]),
  ],
  providers: [
    CampaignQueueService,
    ...(campaignQueueEnabled ? [CampaignQueueProcessor] : []),
    EmailService,
  ],
  exports: [CampaignQueueService],
})
export class CampaignQueueModule {}
