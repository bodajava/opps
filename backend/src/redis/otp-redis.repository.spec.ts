import { Test } from '@nestjs/testing';
import { OtpRedisRepository } from './otp-redis.repository';
import { RedisService } from './redis.service';
import { RedisKeyBuilder } from './redis-key.builder';

describe('OtpRedisRepository', () => {
  const set = jest.fn();
  const ttl = jest.fn();
  const evalCommand = jest.fn();
  const del = jest.fn();

  async function createRepository(): Promise<OtpRedisRepository> {
    const module = await Test.createTestingModule({
      providers: [
        OtpRedisRepository,
        {
          provide: RedisService,
          useValue: { commands: () => ({ set, ttl, eval: evalCommand, del }) },
        },
        {
          provide: RedisKeyBuilder,
          useValue: {
            otpSend: () => 'test:otp:send',
            otpAttempts: () => 'test:otp:attempts',
            otpLock: () => 'test:otp:lock',
          },
        },
      ],
    }).compile();
    return module.get(OtpRedisRepository);
  }

  beforeEach(() => {
    set.mockReset();
    ttl.mockReset();
    evalCommand.mockReset();
    del.mockReset();
  });

  it('reserves cooldown atomically with SET NX EX', async () => {
    set.mockResolvedValue('OK');
    const repository = await createRepository();
    await expect(
      repository.reserveSend('signup', 'person@example.com', 60),
    ).resolves.toBe(0);
    expect(set).toHaveBeenCalledWith('test:otp:send', '1', 'EX', 60, 'NX');
  });

  it('returns remaining cooldown when reservation already exists', async () => {
    set.mockResolvedValue(null);
    ttl.mockResolvedValue(37);
    const repository = await createRepository();
    await expect(
      repository.reserveSend('signup', 'person@example.com', 60),
    ).resolves.toBe(37);
  });

  it('locks at the maximum attempts based on one Lua operation', async () => {
    evalCommand.mockResolvedValue([5, 900]);
    const repository = await createRepository();
    await expect(
      repository.recordFailure('signup', 'person@example.com', 5, 600, 900),
    ).resolves.toEqual({
      allowed: false,
      attempts: 5,
      remaining: 0,
      retryAfterSeconds: 900,
    });
  });
});
