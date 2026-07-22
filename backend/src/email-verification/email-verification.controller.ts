import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EmailVerificationService } from './email-verification.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { EmailOtpPurpose } from './schemas/email-otp.schema';
import { Public } from '../common/decorators/public.decorator';

@Public()
@Controller('checkout/email')
export class EmailVerificationController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOTP(@Body() dto: SendOtpDto) {
    const purpose =
      dto.purpose === 'checkout'
        ? EmailOtpPurpose.CHECKOUT_VERIFICATION
        : EmailOtpPurpose.EMAIL_VERIFICATION;
    return this.emailVerificationService.sendOTP(dto.email, purpose);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOTP(@Body() dto: VerifyOtpDto) {
    const purpose =
      dto.purpose === 'checkout'
        ? EmailOtpPurpose.CHECKOUT_VERIFICATION
        : EmailOtpPurpose.EMAIL_VERIFICATION;
    return this.emailVerificationService.verifyOTP(dto.email, dto.otp, purpose);
  }
}
