import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import IORedis from 'ioredis';
import { CampaignQueueService } from './campaign-queue.service';
import { CampaignQueueProcessor } from './campaign-queue.processor';
import { Campaign, CampaignSchema } from '../campaigns/schemas/campaign.schema';
import { EmailService } from '../common/providers/email.service';

const campaignQueueEnabled = process.env.CAMPAIGN_QUEUE_ENABLED === 'true';

@Module({
  imports: [
    ...(campaignQueueEnabled
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
              connection: {
                host: configService.get<string>('app.redisHost', 'localhost'),
                port: configService.get<number>('app.redisPort', 6379),
                password:
                  configService.get<string>('app.redisPassword') || undefined,
              },
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
export class CampaignQueueModule implements OnModuleInit {
  private readonly logger = new Logger(CampaignQueueModule.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.configService.get<boolean>(
      'app.campaignQueueEnabled',
      false,
    );
    if (!enabled) {
      return;
    }

    const host = this.configService.get<string>('app.redisHost', 'localhost');
    const port = this.configService.get<number>('app.redisPort', 6379);

    try {
      const redis = new IORedis({
        host,
        port,
        password:
          this.configService.get<string>('app.redisPassword') || undefined,
        connectTimeout: 5000,
        retryStrategy: () => null,
      });
      await redis.ping();
      await redis.quit();
      this.logger.log(`Redis connection verified at ${host}:${port}`);
    } catch {
      this.logger.warn(
        `Redis is unreachable at ${host}:${port}. Campaign queue will not be available. ` +
          `Set CAMPAIGN_QUEUE_ENABLED=false or ensure Redis is running.`,
      );
    }
  }
}
