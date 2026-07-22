import { Module, forwardRef, OnModuleInit, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from '../refresh-tokens/schemas/refresh-token.schema';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from '../common/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '../common/strategies/jwt-refresh.strategy';
import { EmailService } from '../common/providers/email.service';
import { EmailVerificationModule } from '../email-verification/email-verification.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('app.jwtAccessSecret');
        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET is required but not configured');
        }
        return {
          secret,
          signOptions: {
            expiresIn: 900,
          },
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    forwardRef(() => UsersModule),
    EmailVerificationModule,
  ],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, EmailService],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const refreshSecret = this.configService.get<string>(
      'app.jwtRefreshSecret',
    );
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is required but not configured');
    }
    this.logger.log('Auth module initialized');
  }
}
