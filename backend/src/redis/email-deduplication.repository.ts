import { Injectable } from '@nestjs/common';
import { RedisKeyBuilder } from './redis-key.builder';
import { RedisService } from './redis.service';
import { EmailDeduplicationState, RedisFeature } from './redis.types';

@Injectable()
export class EmailDeduplicationRepository {
  constructor(
    private readonly redis: RedisService,
    private readonly keys: RedisKeyBuilder,
  ) {}

  async reserve(
    template: string,
    recipient: string,
    operationId: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.redis
      .commands(RedisFeature.Email)
      .set(
        this.keys.emailDeduplication(template, recipient, operationId),
        EmailDeduplicationState.Queued,
        'EX',
        ttlSeconds,
        'NX',
      );
    return result === 'OK';
  }

  async mark(
    template: string,
    recipient: string,
    operationId: string,
    state: EmailDeduplicationState,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis
      .commands(RedisFeature.Email)
      .set(
        this.keys.emailDeduplication(template, recipient, operationId),
        state,
        'EX',
        ttlSeconds,
      );
  }
}
