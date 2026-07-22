import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.findById(user.sub);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      fullName?: string;
      phone?: string;
      secondaryPhone?: string;
    },
  ) {
    return this.usersService.update(user.sub, body);
  }

  @Patch('me/marketing-consent')
  @HttpCode(HttpStatus.OK)
  async updateMarketingConsent(
    @CurrentUser() user: JwtPayload,
    @Body() body: { consent: boolean },
  ) {
    if (typeof body.consent !== 'boolean') {
      throw new BadRequestException('consent must be a boolean');
    }
    return this.usersService.updateMarketingConsent(user.sub, body.consent);
  }
}
