import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VerifiedAccountGuard } from './verified-account.guard';
import { AccountStatus, User } from '../../users/schemas/user.schema';

describe('VerifiedAccountGuard', () => {
  const lean = jest.fn();
  const users = {
    findById: jest.fn(() => ({
      select: () => ({ lean }),
    })),
  };

  async function guard(): Promise<VerifiedAccountGuard> {
    const module = await Test.createTestingModule({
      providers: [
        VerifiedAccountGuard,
        { provide: getModelToken(User.name), useValue: users },
      ],
    }).compile();
    return module.get(VerifiedAccountGuard);
  }

  function context(user?: { sub: string }): ExecutionContext {
    return new ExecutionContextHost([{ user }]);
  }

  it('rejects guests before touching cart data', async () => {
    await expect((await guard()).canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects pending accounts', async () => {
    lean.mockResolvedValue({
      isActive: true,
      isBlocked: false,
      accountStatus: AccountStatus.PendingVerification,
    });
    await expect(
      (await guard()).canActivate(context({ sub: 'pending-user' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows verified active accounts', async () => {
    lean.mockResolvedValue({
      isActive: true,
      isBlocked: false,
      accountStatus: AccountStatus.Verified,
    });
    await expect(
      (await guard()).canActivate(context({ sub: 'verified-user' })),
    ).resolves.toBe(true);
  });
});
