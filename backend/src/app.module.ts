import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

import { envConfig } from './config/env.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminsModule } from './admins/admins.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductVariantsModule } from './product-variants/product-variants.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { CouponsModule } from './coupons/coupons.module';
import { CustomersModule } from './customers/customers.module';
import { AddressesModule } from './addresses/addresses.module';
import { EmailVerificationModule } from './email-verification/email-verification.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InventoryModule } from './inventory/inventory.module';
import { DeliveryZonesModule } from './delivery-zones/delivery-zones.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FinancialPlanningModule } from './financial-planning/financial-planning.module';
import { UploadsModule } from './uploads/uploads.module';
import { SettingsModule } from './settings/settings.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { HealthModule } from './health/health.module';
import { ContactModule } from './contact/contact.module';
import { CampaignQueueModule } from './campaign-queue/campaign-queue.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { UnsubscribeModule } from './unsubscribe/unsubscribe.module';
import { SeedModule } from './seed/seed.module';
import { RedisModule } from './redis/redis.module';
import { EmailQueueModule } from './email-queue/email-queue.module';
import { RedisThrottlerStorage } from './redis/redis-throttler.storage';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('app.mongodbUri'),
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    EmailQueueModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl:
              configService.get<number>('app.rateLimitTtlSeconds', 60) * 1000,
            limit: configService.get<number>('app.rateLimitMaxRequests', 100),
          },
        ],
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
        if (nodeEnv === 'production') {
          return [
            {
              rootPath: join(__dirname, '..', 'public'),
              serveRoot: '/',
              exclude: ['/api/(.*)'],
            },
          ];
        }
        return [];
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    AdminsModule,
    RolesModule,
    PermissionsModule,
    ProductsModule,
    CategoriesModule,
    ProductVariantsModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    PaymentsModule,
    PaymentMethodsModule,
    CouponsModule,
    CustomersModule,
    AddressesModule,
    EmailVerificationModule,
    NotificationsModule,
    InventoryModule,
    DeliveryZonesModule,
    AnalyticsModule,
    FinancialPlanningModule,
    UploadsModule,
    SettingsModule,
    AuditLogsModule,
    HealthModule,
    ContactModule,
    CampaignQueueModule,
    CampaignsModule,
    UnsubscribeModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: ThrottlerStorage,
      useClass: RedisThrottlerStorage,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
