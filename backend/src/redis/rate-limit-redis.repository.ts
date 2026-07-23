import { Injectable } from '@nestjs/common';
import { RedisKeyBuilder } from './redis-key.builder';
import { RedisService } from './redis.service';
import { RateLimitResult, RedisFeature } from './redis.types';

const RATE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;

@Injectable()
export class RateLimitRedisRepository {
  constructor(
    private readonly redis: RedisService,
    private readonly keys: RedisKeyBuilder,
  ) {}

  async consume(
    route: string,
    identity: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const result = await this.redis
      .commands(RedisFeature.RateLimit)
      .eval(
        RATE_SCRIPT,
        1,
        this.keys.rate(route, identity),
        windowSeconds * 1000,
      );
    if (
      !Array.isArray(result) ||
      typeof result[0] !== 'number' ||
      typeof result[1] !== 'number'
    ) {
      throw new Error('Invalid Redis rate-limit response');
    }
    const count = result[0];
    const retryAfterSeconds = Math.max(1, Math.ceil(result[1] / 1000));
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds,
      resetAtEpochSeconds: Math.ceil(Date.now() / 1000) + retryAfterSeconds,
    };
  }
}
