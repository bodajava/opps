import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UnsubscribeToken,
  UnsubscribeTokenDocument,
} from './schemas/unsubscribe-token.schema';
import { UnsubscribeTokenService } from '../common/services/unsubscribe.service';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class UnsubscribeService {
  constructor(
    @InjectModel(UnsubscribeToken.name)
    private readonly unsubscribeTokenModel: Model<UnsubscribeTokenDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly tokenService: UnsubscribeTokenService,
  ) {}

  async generateToken(email: string): Promise<{ raw: string }> {
    const { raw, hash } = this.tokenService.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.unsubscribeTokenModel.create({
      tokenHash: hash,
      email,
      purpose: 'marketing_unsubscribe',
      expiresAt,
    });

    return { raw };
  }

  async getEmailFromToken(token: string): Promise<string | null> {
    const hash = this.tokenService.hashToken(token);
    const doc = await this.unsubscribeTokenModel
      .findOne({ tokenHash: hash })
      .exec();
    if (!doc) return null;
    if (doc.expiresAt < new Date()) return null;
    return doc.email;
  }

  async consumeToken(token: string): Promise<boolean> {
    const hash = this.tokenService.hashToken(token);
    const doc = await this.unsubscribeTokenModel
      .findOne({ tokenHash: hash })
      .exec();
    if (!doc) return false;
    if (doc.expiresAt < new Date()) return false;

    if (!doc.usedAt) {
      await this.unsubscribeTokenModel
        .findByIdAndUpdate(doc._id, { $set: { usedAt: new Date() } })
        .exec();
    }

    await this.userModel
      .updateOne(
        { email: doc.email },
        {
          $set: {
            marketingConsent: false,
            marketingUnsubscribedAt: new Date(),
          },
        },
      )
      .exec();

    return true;
  }
}
