import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Campaign, CampaignDocument } from './schemas/campaign.schema';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { EmailService } from '../common/providers/email.service';
import { CampaignQueueService } from '../campaign-queue/campaign-queue.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { UnsubscribeService } from '../unsubscribe/unsubscribe.service';

export interface CampaignTargeting {
  audience?: Campaign['audience'];
  customerEmails?: string[];
  minOrders?: number | null;
  minSpent?: number | null;
  inactiveDays?: number | null;
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectModel(Campaign.name)
    private readonly campaignModel: Model<CampaignDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly campaignQueueService: CampaignQueueService,
    private readonly unsubscribeService: UnsubscribeService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const { page = 1, limit = 20, status, search } = query;
    const filter: DynamicRecord = {};

    if (status) filter.status = status;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { subject: { $regex: escaped, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.campaignModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.campaignModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<CampaignDocument> {
    const campaign = await this.campaignModel.findById(id).exec();
    if (!campaign) {
      throw new NotFoundException(`Campaign with id "${id}" not found`);
    }
    return campaign;
  }

  async create(dto: CreateCampaignDto): Promise<CampaignDocument> {
    return this.campaignModel.create(dto);
  }

  async update(id: string, dto: UpdateCampaignDto): Promise<CampaignDocument> {
    const campaign = await this.campaignModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' })
      .exec();
    if (!campaign) {
      throw new NotFoundException(`Campaign with id "${id}" not found`);
    }
    return campaign;
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const campaign = await this.campaignModel.findByIdAndDelete(id).exec();
    if (!campaign) {
      throw new NotFoundException(`Campaign with id "${id}" not found`);
    }
    return { deleted: true };
  }

  async getTargetEmails(campaign: CampaignTargeting): Promise<string[]> {
    if (!campaign.audience || campaign.audience === 'all') {
      const users = await this.userModel
        .find({
          isActive: true,
          isBlocked: false,
          marketingConsent: true,
          marketingUnsubscribedAt: null,
        })
        .select('email')
        .exec();
      return users.map((u) => u.email).filter(Boolean);
    }

    if (campaign.audience === 'specific') {
      return campaign.customerEmails || [];
    }

    const filter: DynamicRecord = {
      isActive: true,
      isBlocked: false,
      marketingConsent: true,
      marketingUnsubscribedAt: null,
    };

    const allUsers = await this.userModel
      .find(filter)
      .select('_id email')
      .exec();

    const emails: string[] = [];

    for (const user of allUsers) {
      const orderCount = await this.orderModel
        .countDocuments({ user: user._id.toString() })
        .exec();

      if (campaign.audience === 'new_customers' && orderCount === 0) {
        emails.push(user.email);
      } else if (campaign.audience === 'returning' && orderCount > 0) {
        emails.push(user.email);
      } else if (campaign.audience === 'high_value') {
        if (orderCount === 0) continue;
        if (campaign.minOrders && orderCount < campaign.minOrders) continue;
        const lastOrder = await this.orderModel
          .findOne({ user: user._id.toString() })
          .sort({ createdAt: -1 })
          .exec();
        if (
          lastOrder &&
          campaign.minSpent &&
          lastOrder.total < campaign.minSpent
        )
          continue;
        emails.push(user.email);
      } else if (campaign.audience === 'inactive') {
        if (orderCount === 0) continue;
        if (!campaign.inactiveDays) {
          emails.push(user.email);
          continue;
        }
        const lastOrder = await this.orderModel
          .findOne({ user: user._id.toString() })
          .sort({ createdAt: -1 })
          .exec();
        if (lastOrder) {
          const daysSince = Math.floor(
            (Date.now() - lastOrder.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          if (daysSince >= campaign.inactiveDays) {
            emails.push(user.email);
          }
        }
      }
    }

    return emails;
  }

  async sendCampaign(id: string): Promise<CampaignDocument> {
    const queueEnabled = this.configService.get<boolean>(
      'app.campaignQueueEnabled',
      false,
    );
    if (!queueEnabled) {
      throw new BadRequestException(
        'Bulk campaign sending is disabled. Set CAMPAIGN_QUEUE_ENABLED=true and configure Redis/BullMQ queue to enable bulk send. ' +
          'For draft/preview, use the test email endpoint (POST campaigns/:id/test).',
      );
    }

    const campaign = await this.findById(id);

    if (
      campaign.status === 'sent' ||
      campaign.status === 'sending' ||
      campaign.status === 'queued' ||
      campaign.status === 'processing'
    ) {
      throw new BadRequestException(
        `Campaign cannot be sent because its current status is "${campaign.status}"`,
      );
    }

    const targetEmails = await this.getTargetEmails(campaign);

    await this.campaignModel
      .findByIdAndUpdate(id, {
        $set: {
          status: 'queued',
          targetCount: targetEmails.length,
        },
      })
      .exec();

    await this.campaignQueueService.enqueueCampaign(
      id,
      targetEmails,
      campaign.subject,
      campaign.content,
      campaign.senderName,
      campaign.senderEmail,
    );

    return this.findById(id);
  }

  async sendTestEmail(id: string, adminEmail: string) {
    const campaign = await this.findById(id);

    if (!campaign.subject || !campaign.content) {
      throw new BadRequestException('Campaign must have a subject and content');
    }

    const appUrl = this.configService.get<string>(
      'app.appUrl',
      'http://localhost:3000',
    );
    const { raw: token } =
      await this.unsubscribeService.generateToken(adminEmail);
    const unsubscribeUrl = `${appUrl}/unsubscribe?token=${token}`;
    const htmlWithUnsubscribe = `${campaign.content}\n<p style="font-size:12px;color:#999;margin-top:24px"><a href="${unsubscribeUrl}">Unsubscribe</a> from marketing emails.</p>`;

    await this.emailService.sendMailExternal({
      to: adminEmail,
      subject: `[TEST] ${campaign.subject}`,
      html: htmlWithUnsubscribe,
    });

    this.logger.log(`Test campaign email sent to admin ${adminEmail}`);

    return { message: 'Test email sent to admin', email: adminEmail };
  }

  async getRecipientInfo(id: string) {
    const campaign = await this.findById(id);
    const emails = await this.getTargetEmails(campaign);

    return {
      total: emails.length,
      audience: campaign.audience,
      sampleEmails: emails.slice(0, 5),
      note: 'Bulk sending requires CAMPAIGN_QUEUE_ENABLED=true with Redis/BullMQ',
    };
  }
}
