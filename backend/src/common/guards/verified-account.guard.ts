import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Request } from 'express';
import {
  AccountStatus,
  User,
  UserDocument,
} from '../../users/schemas/user.schema';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class VerifiedAccountGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user?.sub)
      throw new UnauthorizedException('Authentication required');
    const user = await this.users
      .findById(request.user.sub)
      .select('accountStatus emailVerifiedAt isActive isBlocked')
      .lean();
    if (!user || !user.isActive || user.isBlocked) {
      throw new ForbiddenException('Account is unavailable');
    }
    const legacyVerified = user.accountStatus === undefined;
    if (!legacyVerified && user.accountStatus !== AccountStatus.Verified) {
      throw new ForbiddenException('Account verification required');
    }
    return true;
  }
}
