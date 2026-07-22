import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  EmailOtp,
  EmailOtpDocument,
  EmailOtpPurpose,
} from './schemas/email-otp.schema';
import {
  VerificationProof,
  VerificationProofDocument,
  ProofPurpose,
} from './schemas/verification-proof.schema';
import { OtpHelper } from '../common/helpers/otp.helper';
import { EmailService } from '../common/providers/email.service';

function generateProofToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @InjectModel(EmailOtp.name)
    private readonly emailOtpModel: Model<EmailOtpDocument>,
    @InjectModel(VerificationProof.name)
    private readonly proofModel: Model<VerificationProofDocument>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async sendOTP(
    email: string,
    purpose: EmailOtpPurpose = EmailOtpPurpose.EMAIL_VERIFICATION,
  ): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const cooldownMinutes = this.configService.get<number>(
      'app.emailOtpCooldownMinutes',
      1,
    );
    const expiresMinutes = this.configService.get<number>(
      'app.emailOtpExpiresMinutes',
      10,
    );

    const recentOtp = await this.emailOtpModel.findOne({
      email: normalizedEmail,
      purpose,
      isVerified: false,
      isUsed: false,
      createdAt: { $gt: new Date(Date.now() - cooldownMinutes * 60 * 1000) },
    });

    if (recentOtp) {
      const waitSeconds = Math.ceil(
        (recentOtp.createdAt.getTime() +
          cooldownMinutes * 60 * 1000 -
          Date.now()) /
          1000,
      );
      throw new BadRequestException(
        `Please wait ${waitSeconds} seconds before requesting a new OTP`,
      );
    }

    const otp = OtpHelper.generateOTP();
    const hashedOtp = await OtpHelper.hashOTP(otp);

    await this.emailOtpModel.create({
      email: normalizedEmail,
      otp: hashedOtp,
      purpose,
      expiresAt: new Date(Date.now() + expiresMinutes * 60 * 1000),
      attempts: 0,
      maxAttempts: 5,
      isVerified: false,
      isUsed: false,
      lastResendAt: new Date(),
    });

    await this.emailService.sendOTP(normalizedEmail, otp);

    this.logger.log(`OTP sent for purpose: ${purpose}`);

    return { message: 'OTP sent successfully' };
  }

  async verifyOTP(
    email: string,
    otp: string,
    purpose: EmailOtpPurpose = EmailOtpPurpose.EMAIL_VERIFICATION,
  ): Promise<{ verified: boolean; message: string; proofToken?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const otpRecord = await this.emailOtpModel.findOne({
      email: normalizedEmail,
      purpose,
      isVerified: false,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      throw new BadRequestException(
        'No valid OTP found. Please request a new one.',
      );
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      throw new BadRequestException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    const isValid = await OtpHelper.verifyOTP(otp, otpRecord.otp);

    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new BadRequestException('Invalid OTP code');
    }

    otpRecord.isVerified = true;
    otpRecord.isUsed = true;
    await otpRecord.save();

    this.logger.log(`OTP verified for purpose: ${purpose}`);

    if (purpose === EmailOtpPurpose.CHECKOUT_VERIFICATION) {
      const { raw, hash } = generateProofToken();
      await this.proofModel.create({
        tokenHash: hash,
        email: normalizedEmail,
        purpose: ProofPurpose.CHECKOUT_VERIFICATION,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      return {
        verified: true,
        message: 'OTP verified successfully',
        proofToken: raw,
      };
    }

    return {
      verified: true,
      message: 'OTP verified successfully',
    };
  }
}
