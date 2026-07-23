import { Injectable } from '@nestjs/common';
import { RedisKeyBuilder } from './redis-key.builder';
import { RedisService } from './redis.service';
import { RedisFeature } from './redis.types';

const LOGIN_SCRIPT = `
local ip = redis.call('INCR', KEYS[1])
if ip == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local pair = redis.call('INCR', KEYS[2])
if pair == 1 then redis.call('EXPIRE', KEYS[2], ARGV[1]) end
if pair >= tonumber(ARGV[2]) then redis.call('EXPIRE', KEYS[2], ARGV[3]) end
if ip >= tonumber(ARGV[2]) * 4 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end
return {ip, pair, math.max(redis.call('TTL', KEYS[1]), redis.call('TTL', KEYS[2]))}
`;

export interface LoginAttemptResult {
  blocked: boolean;
  retryAfterSeconds: number;
}

@Injectable()
export class LoginAttemptRedisRepository {
  constructor(
    private readonly redis: RedisService,
    private readonly keys: RedisKeyBuilder,
  ) {}

  async recordFailure(
    ip: string,
    email: string,
    maximum: number,
    windowSeconds: number,
    lockSeconds: number,
  ): Promise<LoginAttemptResult> {
    const result = await this.redis
      .commands(RedisFeature.Login)
      .eval(
        LOGIN_SCRIPT,
        2,
        this.keys.loginIp(ip),
        this.keys.loginPair(ip, email),
        windowSeconds,
        maximum,
        lockSeconds,
      );
    if (
      !Array.isArray(result) ||
      typeof result[0] !== 'number' ||
      typeof result[1] !== 'number' ||
      typeof result[2] !== 'number'
    ) {
      throw new Error('Invalid Redis login-attempt response');
    }
    return {
      blocked: result[0] >= maximum * 4 || result[1] >= maximum,
      retryAfterSeconds: Math.max(1, result[2]),
    };
  }

  async isBlocked(
    ip: string,
    email: string,
    maximum: number,
  ): Promise<LoginAttemptResult> {
    const client = this.redis.commands(RedisFeature.Login);
    const ipKey = this.keys.loginIp(ip);
    const pairKey = this.keys.loginPair(ip, email);
    const [ipCountRaw, pairCountRaw, ipTtl, pairTtl] = await Promise.all([
      client.get(ipKey),
      client.get(pairKey),
      client.ttl(ipKey),
      client.ttl(pairKey),
    ]);
    const ipCount = ipCountRaw === null ? 0 : Number(ipCountRaw);
    const pairCount = pairCountRaw === null ? 0 : Number(pairCountRaw);
    if (!Number.isInteger(ipCount) || !Number.isInteger(pairCount)) {
      throw new Error('Invalid Redis login counter');
    }
    return {
      blocked: ipCount >= maximum * 4 || pairCount >= maximum,
      retryAfterSeconds: Math.max(1, ipTtl, pairTtl),
    };
  }

  async clear(ip: string, email: string): Promise<void> {
    await this.redis
      .commands(RedisFeature.Login)
      .del(this.keys.loginPair(ip, email));
  }
}
