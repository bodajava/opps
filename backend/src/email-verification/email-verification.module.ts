import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailVerificationService } from './email-verification.service';
import { EmailVerificationController } from './email-verification.controller';
import { EmailOtp, EmailOtpSchema } from './schemas/email-otp.schema';
import {
  VerificationProof,
  VerificationProofSchema,
} from './schemas/verification-proof.schema';
import { EmailService } from '../common/providers/email.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailOtp.name, schema: EmailOtpSchema },
      { name: VerificationProof.name, schema: VerificationProofSchema },
    ]),
  ],
  providers: [EmailVerificationService, EmailService],
  controllers: [EmailVerificationController],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}
