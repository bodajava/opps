import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Campaign,
  CampaignDocument,
} from '../campaigns/schemas/campaign.schema';
import { EmailService } from '../common/providers/email.service';
import { CampaignJobData } from './interfaces/campaign-job-data.interface';

@Processor('campaign')
export class CampaignQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignQueueProcessor.name);

  constructor(
    @InjectModel(Campaign.name)
    private readonly campaignModel: Model<CampaignDocument>,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<CampaignJobData>): Promise<void> {
    const { campaignId, recipient, subject, content } = job.data;

    this.logger.log(
      `Processing campaign recipient job for campaign ${campaignId}`,
    );

    await this.campaignModel
      .findByIdAndUpdate(campaignId, { $set: { status: 'processing' } })
      .exec();

    try {
      const campaign = await this.campaignModel.findById(campaignId).exec();
      if (campaign?.sentEmails?.includes(recipient)) {
        return;
      }

      await this.emailService.sendMailExternal({
        to: recipient,
        subject,
        html: content,
      });

      await this.campaignModel
        .findByIdAndUpdate(campaignId, {
          $inc: { sentCount: 1 },
          $push: { sentEmails: recipient },
        })
        .exec();
    } catch (error) {
      this.logger.warn(
        `Campaign recipient job failed for campaign ${campaignId}`,
      );

      await this.campaignModel
        .findByIdAndUpdate(campaignId, {
          $inc: { failedCount: 1 },
        })
        .exec();
      throw error;
    }

    const updated = await this.campaignModel.findById(campaignId).exec();
    if (
      updated &&
      updated.sentCount + updated.failedCount >= updated.targetCount
    ) {
      const status =
        updated.failedCount === 0
          ? 'sent'
          : updated.sentCount > 0
            ? 'partially_failed'
            : 'failed';
      await this.campaignModel
        .findByIdAndUpdate(campaignId, { $set: { status, sentAt: new Date() } })
        .exec();
    }
  }
}
