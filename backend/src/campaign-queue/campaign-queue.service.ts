import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CampaignJobData } from './interfaces/campaign-job-data.interface';
import { createHash } from 'crypto';

@Injectable()
export class CampaignQueueService {
  private readonly logger = new Logger(CampaignQueueService.name);

  constructor(
    @InjectQueue('campaign')
    @Optional()
    private readonly campaignQueue: Queue | undefined,
    private readonly configService: ConfigService,
  ) {}

  async enqueueCampaign(
    campaignId: string,
    recipients: string[],
    subject: string,
    content: string,
    _senderName?: string,
    _senderEmail?: string,
  ): Promise<void> {
    const enabled =
      this.configService.get<boolean>('app.emailQueueEnabled', false) ||
      this.configService.get<boolean>('app.campaignQueueEnabled', false);
    if (!enabled) {
      throw new Error('Campaign queue is disabled');
    }

    if (!this.campaignQueue) throw new Error('Campaign queue is unavailable');

    try {
      for (const recipient of recipients) {
        const jobData: CampaignJobData = {
          campaignId,
          recipient,
          subject,
          content,
        };
        const recipientHash = createHash('sha256')
          .update(recipient.trim().toLowerCase())
          .digest('hex');
        await this.campaignQueue.add('send-campaign-recipient', jobData, {
          jobId: `campaign-${campaignId}-${recipientHash}`,
          attempts: this.configService.get<number>(
            'app.emailQueueMaxAttempts',
            5,
          ),
          backoff: {
            type: 'exponential',
            delay: this.configService.get<number>(
              'app.emailQueueBackoffMs',
              5000,
            ),
          },
          removeOnComplete: { age: 604800, count: 10000 },
          removeOnFail: { age: 2592000, count: 10000 },
        });
      }
      this.logger.log(
        `Enqueued campaign ${campaignId} with ${recipients.length} recipients`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue campaign ${campaignId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error(
        'Failed to enqueue campaign. The queue service is currently unavailable.',
      );
    }
  }
}
