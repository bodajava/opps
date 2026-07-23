import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.types';
import { RedisService } from './redis.service';
import { RedisKeyBuilder } from './redis-key.builder';
import { RateLimitRedisRepository } from './rate-limit-redis.repository';
import { OtpRedisRepository } from './otp-redis.repository';
import { EmailDeduplicationRepository } from './email-deduplication.repository';
import { LoginAttemptRedisRepository } from './login-attempt-redis.repository';
import { RedisThrottlerStorage } from './redis-throttler.storage';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const enabled = config.get<boolean>('app.redisEnabled', false);
        const url =
          config.get<string>('app.redisUrl') || 'redis://localhost:6379';
        return new Redis(url, {
          lazyConnect: true,
          enableOfflineQueue: false,
          connectTimeout: config.get<number>(
            'app.redisConnectTimeoutMs',
            10000,
          ),
          commandTimeout: config.get<number>('app.redisCommandTimeoutMs', 5000),
          maxRetriesPerRequest: 1,
          retryStrategy: enabled
            ? (attempt): number | null =>
                attempt > 8 ? null : Math.min(attempt * 250, 5000)
            : () => null,
        });
      },
    },
    RedisService,
    RedisKeyBuilder,
    RateLimitRedisRepository,
    OtpRedisRepository,
    EmailDeduplicationRepository,
    LoginAttemptRedisRepository,
    RedisThrottlerStorage,
  ],
  exports: [
    RedisService,
    RedisKeyBuilder,
    RateLimitRedisRepository,
    OtpRedisRepository,
    EmailDeduplicationRepository,
    LoginAttemptRedisRepository,
    RedisThrottlerStorage,
    REDIS_CLIENT,
  ],
})
export class RedisModule {}
