import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Throttle } from '@nestjs/throttler';
import {
  ResendRegistrationOtpDto,
  VerifyRegistrationOtpDto,
} from './dto/registration-verification.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.headers['user-agent'], req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post('registration/verify')
  @HttpCode(HttpStatus.OK)
  async verifyRegistration(
    @Body() dto: VerifyRegistrationOtpDto,
    @Req() req: Request,
  ) {
    return this.authService.verifyRegistration(
      dto.verificationFlowId,
      dto.otp,
      req.headers['user-agent'],
      req.ip,
    );
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 900000 } })
  @Post('registration/resend')
  @HttpCode(HttpStatus.OK)
  async resendRegistration(@Body() dto: ResendRegistrationOtpDto) {
    return this.authService.resendRegistration(dto.verificationFlowId);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.headers['user-agent'], req.ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refreshTokens(
      dto.refreshToken,
      req.headers['user-agent'],
      req.ip,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: JwtPayload, @Body() dto: RefreshTokenDto) {
    await this.authService.logout(user.sub, dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 900000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(dto.email, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }
}
