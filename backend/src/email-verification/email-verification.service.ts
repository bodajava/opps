import {
  Injectable,
  BadRequestException,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
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
import { OtpRedisRepository } from '../redis/otp-redis.repository';
import { RedisService } from '../redis/redis.service';
import { RateLimitException } from '../common/exceptions/rate-limit.exception';
import { RedisFeature, RedisUnavailableError } from '../redis/redis.types';
import { EmailProducerService } from '../email-queue/email-producer.service';
import { EmailJobKind } from '../email-queue/email-job.types';
import { EmailPayloadCipherService } from '../email-queue/email-payload-cipher.service';

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
    @Optional() private readonly otpRepository?: OtpRedisRepository,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly emailProducer?: EmailProducerService,
    @Optional() private readonly emailPayloadCipher?: EmailPayloadCipherService,
  ) {}

  async sendOTP(
    email: string,
    purpose: EmailOtpPurpose = EmailOtpPurpose.EMAIL_VERIFICATION,
    verificationFlowHash?: string,
  ): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const cooldownSeconds = this.configService.get<number>(
      'app.emailOtpResendSeconds',
      60,
    );
    const expiresMinutes = this.configService.get<number>(
      'app.emailOtpExpiresMinutes',
      10,
    );

    if (this.redisService?.isEnabled()) {
      try {
        if (!this.otpRepository)
          throw new RedisUnavailableError(RedisFeature.Otp);
        const retryAfterSeconds = await this.otpRepository.reserveSend(
          purpose,
          normalizedEmail,
          cooldownSeconds,
        );
        if (retryAfterSeconds > 0) {
          throw new RateLimitException({
            code: 'OTP_RATE_LIMITED',
            message: 'Please wait before requesting another code.',
            retryAfterSeconds,
            limit: 1,
            remaining: 0,
            resetAtEpochSeconds:
              Math.ceil(Date.now() / 1000) + retryAfterSeconds,
          });
        }
      } catch (error) {
        if (error instanceof RateLimitException) throw error;
        throw new ServiceUnavailableException(
          'OTP protection is temporarily unavailable',
        );
      }
    } else {
      const recentOtp = await this.emailOtpModel.findOne({
        email: normalizedEmail,
        purpose,
        isVerified: false,
        isUsed: false,
        createdAt: { $gt: new Date(Date.now() - cooldownSeconds * 1000) },
      });

      if (recentOtp) {
        const waitSeconds = Math.ceil(
          (recentOtp.createdAt.getTime() +
            cooldownSeconds * 1000 -
            Date.now()) /
            1000,
        );
        throw new RateLimitException({
          code: 'OTP_RATE_LIMITED',
          message: 'Please wait before requesting another code.',
          retryAfterSeconds: waitSeconds,
          limit: 1,
          remaining: 0,
          resetAtEpochSeconds: Math.ceil(Date.now() / 1000) + waitSeconds,
        });
      }
    }

    const otp = OtpHelper.generateOTP();
    const hashedOtp = await OtpHelper.hashOTP(otp);

    await this.emailOtpModel.updateMany(
      {
        email: normalizedEmail,
        purpose,
        isVerified: false,
        isUsed: false,
      },
      { $set: { isUsed: true, consumedAt: new Date() } },
    );

    await this.emailOtpModel.create({
      email: normalizedEmail,
      otp: hashedOtp,
      purpose,
      expiresAt: new Date(Date.now() + expiresMinutes * 60 * 1000),
      attempts: 0,
      maxAttempts: this.configService.get<number>('app.emailOtpMaxAttempts', 5),
      isVerified: false,
      isUsed: false,
      lastResendAt: new Date(),
      verificationFlowHash,
    });

    if (this.configService.get<boolean>('app.emailQueueEnabled', false)) {
      if (!this.emailProducer || !this.emailPayloadCipher)
        throw new ServiceUnavailableException('Email queue is unavailable');
      await this.emailProducer.enqueue({
        kind: EmailJobKind.Otp,
        recipient: normalizedEmail,
        operationId: purpose,
        encryptedOtp: this.emailPayloadCipher.encrypt(otp),
      });
    } else {
      await this.emailService.sendOTP(normalizedEmail, otp);
    }

    this.logger.log(`OTP sent for purpose: ${purpose}`);

    return { message: 'OTP sent successfully' };
  }

  async verifyRegistrationOTP(
    verificationFlowId: string,
    otp: string,
  ): Promise<string> {
    const verificationFlowHash = crypto
      .createHash('sha256')
      .update(verificationFlowId)
      .digest('hex');
    const otpRecord = await this.emailOtpModel.findOne({
      verificationFlowHash,
      purpose: EmailOtpPurpose.EMAIL_VERIFICATION,
      isVerified: false,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });
    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired verification flow');
    }
    await this.verifyOTP(
      otpRecord.email,
      otp,
      EmailOtpPurpose.EMAIL_VERIFICATION,
    );
    return otpRecord.email;
  }

  async resendRegistrationOTP(
    verificationFlowId: string,
  ): Promise<{ resendAfterSeconds: number }> {
    const verificationFlowHash = crypto
      .createHash('sha256')
      .update(verificationFlowId)
      .digest('hex');
    const previous = await this.emailOtpModel
      .findOne({ verificationFlowHash })
      .sort({ createdAt: -1 });
    if (!previous) {
      throw new BadRequestException('Invalid or expired verification flow');
    }
    await this.sendOTP(
      previous.email,
      EmailOtpPurpose.EMAIL_VERIFICATION,
      verificationFlowHash,
    );
    return {
      resendAfterSeconds: this.configService.get<number>(
        'app.emailOtpResendSeconds',
        60,
      ),
    };
  }

  async verifyOTP(
    email: string,
    otp: string,
    purpose: EmailOtpPurpose = EmailOtpPurpose.EMAIL_VERIFICATION,
  ): Promise<{ verified: boolean; message: string; proofToken?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const expiresMinutes = this.configService.get<number>(
      'app.emailOtpExpiresMinutes',
      10,
    );
    if (this.redisService?.isEnabled() && this.otpRepository) {
      const lockSeconds = await this.otpRepository.lockTtl(
        purpose,
        normalizedEmail,
      );
      if (lockSeconds > 0) {
        throw new RateLimitException({
          code: 'OTP_LOCKED',
          message: 'Too many verification attempts.',
          retryAfterSeconds: lockSeconds,
          limit: this.configService.get<number>('app.emailOtpMaxAttempts', 5),
          remaining: 0,
          resetAtEpochSeconds: Math.ceil(Date.now() / 1000) + lockSeconds,
        });
      }
    }
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
      if (this.redisService?.isEnabled()) {
        if (!this.otpRepository)
          throw new ServiceUnavailableException(
            'OTP protection is temporarily unavailable',
          );
        const maximum = this.configService.get<number>(
          'app.emailOtpMaxAttempts',
          5,
        );
        const result = await this.otpRepository.recordFailure(
          purpose,
          normalizedEmail,
          maximum,
          expiresMinutes * 60,
          this.configService.get<number>('app.otpLockSeconds', 900),
        );
        if (!result.allowed)
          throw new RateLimitException({
            code: 'OTP_LOCKED',
            message: 'Too many verification attempts.',
            retryAfterSeconds: result.retryAfterSeconds,
            limit: maximum,
            remaining: 0,
            resetAtEpochSeconds:
              Math.ceil(Date.now() / 1000) + result.retryAfterSeconds,
          });
      } else {
        otpRecord.attempts += 1;
        await otpRecord.save();
      }
      throw new BadRequestException('Invalid OTP code');
    }

    otpRecord.isVerified = true;
    otpRecord.isUsed = true;
    await otpRecord.save();
    if (this.redisService?.isEnabled() && this.otpRepository)
      await this.otpRepository.clear(purpose, normalizedEmail);

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
