import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from '../common/providers/email.service';
import { EmailProducerService } from './email-producer.service';
import { EmailProcessor } from './email.processor';
import { EmailPayloadCipherService } from './email-payload-cipher.service';

const enabled = process.env.EMAIL_QUEUE_ENABLED === 'true';
const queueName = process.env.EMAIL_QUEUE_NAME || 'opps-email';

@Global()
@Module({
  imports: enabled
    ? [
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            connection: { url: config.get<string>('app.redisUrl') },
            defaultJobOptions: {
              attempts: config.get<number>('app.emailQueueMaxAttempts', 5),
              backoff: {
                type: 'exponential',
                delay: config.get<number>('app.emailQueueBackoffMs', 5000),
              },
            },
          }),
        }),
        BullModule.registerQueue({ name: queueName }),
      ]
    : [],
  providers: enabled
    ? [
        EmailService,
        EmailProducerService,
        EmailPayloadCipherService,
        EmailProcessor,
      ]
    : [],
  exports: enabled ? [EmailProducerService, EmailPayloadCipherService] : [],
})
export class EmailQueueModule {}
