import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { EmailDeduplicationRepository } from '../redis/email-deduplication.repository';
import { RedisKeyBuilder } from '../redis/redis-key.builder';
import { EmailJobKind } from './email-job.types';
import { EmailProducerService } from './email-producer.service';

describe('EmailProducerService', () => {
  const add = jest.fn();
  const reserve = jest.fn();

  async function createProducer(): Promise<EmailProducerService> {
    const module = await Test.createTestingModule({
      providers: [
        EmailProducerService,
        {
          provide: getQueueToken(process.env.EMAIL_QUEUE_NAME || 'opps-email'),
          useValue: { add },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback: number | boolean) =>
              key === 'app.emailQueueEnabled' ? true : fallback,
          },
        },
        { provide: EmailDeduplicationRepository, useValue: { reserve } },
        {
          provide: RedisKeyBuilder,
          useValue: { hash: () => 'deterministic-job-id' },
        },
      ],
    }).compile();
    return module.get(EmailProducerService);
  }

  beforeEach(() => {
    add.mockReset();
    reserve.mockReset();
  });

  it('creates a deterministic, retriable BullMQ job after atomic reservation', async () => {
    reserve.mockResolvedValue(true);
    add.mockResolvedValue({ id: 'deterministic-job-id' });
    const producer = await createProducer();
    await expect(
      producer.enqueue({
        kind: EmailJobKind.Otp,
        recipient: 'person@example.com',
        operationId: 'signup',
        encryptedOtp: 'v1.encrypted',
      }),
    ).resolves.toEqual({
      queued: true,
      duplicate: false,
      jobId: 'deterministic-job-id',
    });
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0][2]).toMatchObject({
      jobId: 'deterministic-job-id',
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    });
  });

  it('does not add a second logical email when deduplication is reserved', async () => {
    reserve.mockResolvedValue(false);
    const producer = await createProducer();
    await expect(
      producer.enqueue({
        kind: EmailJobKind.Otp,
        recipient: 'person@example.com',
        operationId: 'signup',
        encryptedOtp: 'v1.encrypted',
      }),
    ).resolves.toMatchObject({ queued: false, duplicate: true });
    expect(add).not.toHaveBeenCalled();
  });
});
