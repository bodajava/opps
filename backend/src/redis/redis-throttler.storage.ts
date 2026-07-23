import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from './redis.service';
import { RedisFeature } from './redis.types';

const THROTTLE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;

interface LocalEntry {
  count: number;
  expiresAt: number;
}

interface DistributedThrottleRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly developmentFallback = new Map<string, LocalEntry>();

  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<DistributedThrottleRecord> {
    if (!this.redis.isEnabled()) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Distributed rate limiting is unavailable',
        );
      }
      const namespacedKey = `${throttlerName}:${key}`;
      const now = Date.now();
      const current = this.developmentFallback.get(namespacedKey);
      const entry =
        !current || current.expiresAt <= now
          ? { count: 1, expiresAt: now + ttl }
          : { count: current.count + 1, expiresAt: current.expiresAt };
      this.developmentFallback.set(namespacedKey, entry);
      const remainingMs = Math.max(1, entry.expiresAt - now);
      return {
        totalHits: entry.count,
        timeToExpire: Math.ceil(remainingMs / 1000),
        isBlocked: entry.count > limit,
        timeToBlockExpire:
          entry.count > limit
            ? Math.ceil(Math.max(blockDuration, remainingMs) / 1000)
            : 0,
      };
    }

    const result = await this.redis
      .commands(RedisFeature.RateLimit)
      .eval(THROTTLE_SCRIPT, 1, `throttle:${throttlerName}:${key}`, ttl);
    if (
      !Array.isArray(result) ||
      typeof result[0] !== 'number' ||
      typeof result[1] !== 'number'
    ) {
      throw new ServiceUnavailableException(
        'Distributed rate limiting is unavailable',
      );
    }
    const totalHits = result[0];
    const seconds = Math.max(1, Math.ceil(result[1] / 1000));
    return {
      totalHits,
      timeToExpire: seconds,
      isBlocked: totalHits > limit,
      timeToBlockExpire:
        totalHits > limit
          ? Math.max(seconds, Math.ceil(blockDuration / 1000))
          : 0,
    };
  }
}
