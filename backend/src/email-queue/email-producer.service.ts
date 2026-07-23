import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { EmailDeduplicationRepository } from '../redis/email-deduplication.repository';
import { RedisKeyBuilder } from '../redis/redis-key.builder';
import { EmailJob } from './email-job.types';

export interface EmailEnqueueResult {
  queued: boolean;
  duplicate: boolean;
  jobId: string;
}

@Injectable()
export class EmailProducerService {
  constructor(
    @InjectQueue(process.env.EMAIL_QUEUE_NAME || 'opps-email')
    private readonly queue: Queue<EmailJob>,
    private readonly config: ConfigService,
    private readonly deduplication: EmailDeduplicationRepository,
    private readonly keys: RedisKeyBuilder,
  ) {}

  async enqueue(job: EmailJob): Promise<EmailEnqueueResult> {
    if (!this.config.get<boolean>('app.emailQueueEnabled', false)) {
      throw new ServiceUnavailableException('Email queue is disabled');
    }
    const ttl = this.config.get<number>(
      'app.emailDeduplicationTtlSeconds',
      300,
    );
    const reserved = await this.deduplication.reserve(
      job.kind,
      job.recipient,
      job.operationId,
      ttl,
    );
    const jobId = this.keys.hash(
      `${job.kind}:${job.recipient}:${job.operationId}`,
    );
    if (!reserved) return { queued: false, duplicate: true, jobId };
    await this.queue.add(job.kind, job, {
      jobId,
      attempts: this.config.get<number>('app.emailQueueMaxAttempts', 5),
      backoff: {
        type: 'exponential',
        delay: this.config.get<number>('app.emailQueueBackoffMs', 5000),
      },
      removeOnComplete: { age: 86400, count: 1000 },
      removeOnFail: { age: 604800, count: 5000 },
    });
    return { queued: true, duplicate: false, jobId };
  }
}
