import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { z } from 'zod';

const accessContainerSchema = z.object({ accessToken: z.string().optional() });

function accessSecret(configService: ConfigService): string {
  const secret = configService.get<string>('app.jwtAccessSecret');
  if (!secret) throw new Error('JWT access secret is not configured');
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          const cookies = accessContainerSchema.safeParse(req.cookies);
          return cookies.success ? (cookies.data.accessToken ?? null) : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: accessSecret(configService),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}
