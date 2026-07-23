import { Injectable } from '@nestjs/common';
import { RedisKeyBuilder } from './redis-key.builder';
import { RedisService } from './redis.service';
import { OtpAttemptResult, RedisFeature } from './redis.types';

const ATTEMPT_SCRIPT = `
if redis.call('EXISTS', KEYS[2]) == 1 then return {-1, redis.call('TTL', KEYS[2])} end
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
if count >= tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'EX', ARGV[3])
  return {count, tonumber(ARGV[3])}
end
return {count, redis.call('TTL', KEYS[1])}
`;

@Injectable()
export class OtpRedisRepository {
  constructor(
    private readonly redis: RedisService,
    private readonly keys: RedisKeyBuilder,
  ) {}

  async reserveSend(
    purpose: string,
    email: string,
    seconds: number,
  ): Promise<number> {
    const client = this.redis.commands(RedisFeature.Otp);
    const key = this.keys.otpSend(purpose, email);
    const reserved = await client.set(key, '1', 'EX', seconds, 'NX');
    if (reserved === 'OK') return 0;
    return Math.max(1, await client.ttl(key));
  }

  async recordFailure(
    purpose: string,
    email: string,
    maximum: number,
    attemptWindowSeconds: number,
    lockSeconds: number,
  ): Promise<OtpAttemptResult> {
    const result = await this.redis
      .commands(RedisFeature.Otp)
      .eval(
        ATTEMPT_SCRIPT,
        2,
        this.keys.otpAttempts(purpose, email),
        this.keys.otpLock(purpose, email),
        attemptWindowSeconds,
        maximum,
        lockSeconds,
      );
    if (
      !Array.isArray(result) ||
      typeof result[0] !== 'number' ||
      typeof result[1] !== 'number'
    ) {
      throw new Error('Invalid Redis OTP-attempt response');
    }
    const attempts = result[0];
    return {
      allowed: attempts >= 0 && attempts < maximum,
      attempts: attempts < 0 ? maximum : attempts,
      remaining: attempts < 0 ? 0 : Math.max(0, maximum - attempts),
      retryAfterSeconds: Math.max(1, result[1]),
    };
  }

  async lockTtl(purpose: string, email: string): Promise<number> {
    return Math.max(
      0,
      await this.redis
        .commands(RedisFeature.Otp)
        .ttl(this.keys.otpLock(purpose, email)),
    );
  }

  async clear(purpose: string, email: string): Promise<void> {
    await this.redis
      .commands(RedisFeature.Otp)
      .del(
        this.keys.otpAttempts(purpose, email),
        this.keys.otpLock(purpose, email),
      );
  }
}
