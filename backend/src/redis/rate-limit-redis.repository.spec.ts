import { Test } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { RedisKeyBuilder } from './redis-key.builder';
import { RateLimitRedisRepository } from './rate-limit-redis.repository';

describe('RateLimitRedisRepository', () => {
  const evalCommand = jest.fn();

  async function createRepository(): Promise<RateLimitRedisRepository> {
    const module = await Test.createTestingModule({
      providers: [
        RateLimitRedisRepository,
        {
          provide: RedisService,
          useValue: { commands: () => ({ eval: evalCommand }) },
        },
        {
          provide: RedisKeyBuilder,
          useValue: {
            rate: (route: string, identity: string) =>
              `test:${route}:${identity}`,
          },
        },
      ],
    }).compile();
    return module.get(RateLimitRedisRepository);
  }

  beforeEach(() => evalCommand.mockReset());

  it('maps the atomic Lua response to rate-limit metadata', async () => {
    evalCommand.mockResolvedValue([2, 4500]);
    const repository = await createRepository();
    await expect(
      repository.consume('login', 'identity', 5, 10),
    ).resolves.toMatchObject({
      allowed: true,
      remaining: 3,
      retryAfterSeconds: 5,
      limit: 5,
    });
  });

  it('rejects malformed Redis responses instead of silently allowing', async () => {
    evalCommand.mockResolvedValue('malformed');
    const repository = await createRepository();
    await expect(
      repository.consume('login', 'identity', 5, 10),
    ).rejects.toThrow('Invalid Redis rate-limit response');
  });
});
