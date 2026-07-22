import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/schemas/user.schema';
import { Role } from '../roles/schemas/role.schema';
import { RefreshToken } from '../refresh-tokens/schemas/refresh-token.schema';
import { EmailService } from '../common/providers/email.service';

function queryResult(value: DynamicValue) {
  return {
    select: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(value) })),
    exec: jest.fn().mockResolvedValue(value),
  };
}

describe('AuthService', () => {
  let service: AuthService;
  const userModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  const roleModel = { findById: jest.fn() };
  const refreshTokenModel = {
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
  };
  const emailService = {
    sendPasswordReset: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Role.name), useValue: roleModel },
        {
          provide: getModelToken(RefreshToken.name),
          useValue: refreshTokenModel,
        },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, fallback: DynamicValue) => fallback),
          },
        },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('returns the same generic forgot-password response for a missing account', async () => {
    userModel.findOne.mockResolvedValue(null);

    await expect(
      service.forgotPassword('missing@example.com'),
    ).resolves.toEqual({
      message: 'If that email exists, a password reset link has been sent',
    });
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('stores only a reset-token hash and delegates delivery without logging the token', async () => {
    userModel.findOne.mockResolvedValue({
      _id: 'user-1',
      email: 'user@example.com',
    });
    userModel.findByIdAndUpdate.mockResolvedValue(null);
    emailService.sendPasswordReset.mockResolvedValue(undefined);

    await service.forgotPassword('user@example.com');

    const storedUpdate = userModel.findByIdAndUpdate.mock.calls[0][1];
    const deliveredToken = emailService.sendPasswordReset.mock.calls[0][1];
    expect(storedUpdate.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/);
    expect(deliveredToken).toMatch(/^[a-f0-9]{64}$/);
    expect(storedUpdate.resetPasswordToken).not.toBe(deliveredToken);
    expect(storedUpdate.resetPasswordExpires.getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  it('keeps forgot-password enumeration-safe when the email provider fails', async () => {
    userModel.findOne.mockResolvedValue({
      _id: 'user-1',
      email: 'user@example.com',
    });
    userModel.findByIdAndUpdate.mockResolvedValue(null);
    emailService.sendPasswordReset.mockRejectedValue(
      new Error('transport unavailable'),
    );

    await expect(service.forgotPassword('user@example.com')).resolves.toEqual({
      message: 'If that email exists, a password reset link has been sent',
    });
  });

  it('rejects invalid or expired password-reset tokens', async () => {
    userModel.findOne.mockResolvedValue(null);

    await expect(
      service.resetPassword('invalid-token', 'Secure123'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resets the password, consumes the token, and revokes active sessions', async () => {
    userModel.findOne.mockResolvedValue({ _id: { toString: () => 'user-1' } });
    userModel.findByIdAndUpdate.mockResolvedValue(null);
    refreshTokenModel.updateMany.mockResolvedValue({ modifiedCount: 2 });

    await service.resetPassword('valid-token', 'Secure123');

    const update = userModel.findByIdAndUpdate.mock.calls[0][1];
    expect(await bcrypt.compare('Secure123', update.password)).toBe(true);
    expect(update.resetPasswordToken).toBeNull();
    expect(update.resetPasswordExpires).toBeNull();
    expect(refreshTokenModel.updateMany).toHaveBeenCalledWith(
      { userId: 'user-1', isRevoked: false },
      { isRevoked: true },
    );
  });

  it('rejects missing and expired refresh tokens', async () => {
    refreshTokenModel.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        _id: 'refresh-1',
        expiresAt: new Date(Date.now() - 1000),
      });
    refreshTokenModel.findByIdAndUpdate.mockResolvedValue(null);

    await expect(service.refreshTokens('missing')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.refreshTokens('expired')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(refreshTokenModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'refresh-1',
      { isRevoked: true },
    );
  });

  it('rotates a refresh token and links the replacement', async () => {
    const storedToken = {
      _id: 'refresh-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
    };
    const user = { isActive: true };
    refreshTokenModel.findOne.mockResolvedValue(storedToken);
    userModel.findById.mockResolvedValue(user);
    refreshTokenModel.findByIdAndUpdate.mockResolvedValue(null);
    jest.spyOn(service, 'generateTokens').mockResolvedValue({
      user: {},
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    await expect(service.refreshTokens('old-refresh')).resolves.toMatchObject({
      refreshToken: 'new-refresh',
    });
    expect(refreshTokenModel.findByIdAndUpdate).toHaveBeenNthCalledWith(
      1,
      'refresh-1',
      { isRevoked: true },
    );
    expect(refreshTokenModel.findByIdAndUpdate).toHaveBeenNthCalledWith(
      2,
      'refresh-1',
      { replacedBy: 'new-refresh' },
    );
  });

  it('rejects bad credentials and accepts a valid password', async () => {
    const passwordHash = await bcrypt.hash('Correct123', 4);
    const user = {
      _id: 'user-1',
      password: passwordHash,
      isActive: true,
      isBlocked: false,
    };
    userModel.findOne.mockReturnValue(queryResult(user));
    jest.spyOn(service, 'generateTokens').mockResolvedValue({
      user: {},
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    await expect(
      service.login({ email: 'user@example.com', password: 'Wrong123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.login({ email: 'user@example.com', password: 'Correct123' }),
    ).resolves.toMatchObject({ accessToken: 'access' });
  });
});
