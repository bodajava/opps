import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CampaignJobData } from './interfaces/campaign-job-data.interface';

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
    senderName?: string,
    senderEmail?: string,
  ): Promise<void> {
    const enabled = this.configService.get<boolean>(
      'app.campaignQueueEnabled',
      false,
    );
    if (!enabled) {
      throw new Error('Campaign queue is disabled');
    }

    if (!this.campaignQueue) throw new Error('Campaign queue is unavailable');

    const jobData: CampaignJobData = {
      campaignId,
      recipients,
      subject,
      content,
      senderName,
      senderEmail,
    };

    try {
      await this.campaignQueue.add('send-campaign', jobData, {
        jobId: `campaign-${campaignId}`,
        removeOnComplete: false,
        removeOnFail: false,
      });
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
