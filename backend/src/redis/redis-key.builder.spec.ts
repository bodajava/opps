import { ConfigService } from '@nestjs/config';
import { RedisKeyBuilder } from './redis-key.builder';

describe('RedisKeyBuilder', () => {
  it('uses the versioned, environment-isolated schema and never exposes email', () => {
    const config = new ConfigService({
      app: { redisKeyPrefix: 'opps-test', nodeEnv: 'test' },
    });
    const keys = new RedisKeyBuilder(config);
    const key = keys.otpSend('signup', ' Person@Example.COM ');
    expect(key).toMatch(/^opps-test:test:v1:otp:send:signup:[a-f0-9]{64}$/);
    expect(key).not.toContain('person@example.com');
  });

  it('normalizes identities before hashing', () => {
    const keys = new RedisKeyBuilder(new ConfigService());
    expect(keys.hash(' Person@Example.com ')).toBe(
      keys.hash('person@example.COM'),
    );
  });
});
