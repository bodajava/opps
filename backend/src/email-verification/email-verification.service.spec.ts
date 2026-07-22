import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { EmailVerificationService } from './email-verification.service';
import { EmailOtp } from './schemas/email-otp.schema';
import { VerificationProof } from './schemas/verification-proof.schema';
import { EmailService } from '../common/providers/email.service';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: getModelToken(EmailOtp.name), useValue: {} },
        { provide: getModelToken(VerificationProof.name), useValue: {} },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(1) },
        },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
