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
    const { campaignId, recipients, subject, content } = job.data;

    this.logger.log(
      `Processing campaign ${campaignId} for ${recipients.length} recipients`,
    );

    await this.campaignModel
      .findByIdAndUpdate(campaignId, { $set: { status: 'processing' } })
      .exec();

    let sent = 0;
    let failed = 0;

    for (const email of recipients) {
      try {
        const campaign = await this.campaignModel.findById(campaignId).exec();
        if (campaign?.sentEmails?.includes(email)) {
          this.logger.log(`Already sent to ${email}, skipping`);
          continue;
        }

        await this.emailService.sendMailExternal({
          to: email,
          subject,
          html: content,
        });

        sent++;

        await this.campaignModel
          .findByIdAndUpdate(campaignId, {
            $inc: { sentCount: 1 },
            $push: { sentEmails: email },
          })
          .exec();
      } catch {
        failed++;
        this.logger.warn(`Failed to send campaign email to ${email}`);

        await this.campaignModel
          .findByIdAndUpdate(campaignId, {
            $inc: { failedCount: 1 },
          })
          .exec();
      }
    }

    this.logger.log(
      `Campaign ${campaignId} completed: ${sent} sent, ${failed} failed`,
    );

    let finalStatus: string;
    if (sent > 0 && failed === 0) {
      finalStatus = 'sent';
    } else if (sent > 0 && failed > 0) {
      finalStatus = 'partially_failed';
    } else if (sent === 0 && failed > 0) {
      finalStatus = 'failed';
    } else {
      finalStatus = 'sent';
    }

    const update: DynamicRecord = {
      status: finalStatus,
    };

    if (finalStatus === 'sent' || finalStatus === 'partially_failed') {
      update.sentAt = new Date();
    }

    await this.campaignModel
      .findByIdAndUpdate(campaignId, { $set: update })
      .exec();
  }
}
