import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { z } from 'zod';

const refreshContainerSchema = z.object({
  refreshToken: z.string().optional(),
});

// The passport-jwt overload requires the literal type; keep this cast-free.
// eslint-disable-next-line @typescript-eslint/prefer-as-const
const passRequestToCallback: true = true;

function refreshSecret(configService: ConfigService): string {
  const secret = configService.get<string>('app.jwtRefreshSecret');
  if (!secret) throw new Error('JWT refresh secret is not configured');
  return secret;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const body = refreshContainerSchema.safeParse(req.body);
          const cookies = refreshContainerSchema.safeParse(req.cookies);
          return (
            (body.success ? body.data.refreshToken : undefined) ||
            (cookies.success ? cookies.data.refreshToken : undefined) ||
            null
          );
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: refreshSecret(configService),
      passReqToCallback: passRequestToCallback,
    });
  }

  validate(
    req: Request,
    payload: JwtPayload,
  ): JwtPayload & { refreshToken: string } {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const body = refreshContainerSchema.safeParse(req.body);
    const cookies = refreshContainerSchema.safeParse(req.cookies);
    const refreshToken =
      (body.success ? body.data.refreshToken : undefined) ||
      (cookies.success ? cookies.data.refreshToken : undefined);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
      refreshToken,
    };
  }
}
