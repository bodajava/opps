import { registerAs } from '@nestjs/config';

export interface EnvConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  appName: string;
  appUrl: string;
  backendUrl: string;
  mongodbUri: string;
  jwtAccessSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  bcryptSaltRounds: number;
  corsOrigins: string[];
  cookieSecret: string;
  cookieSecure: boolean;
  cookieSameSite: string;
  cookieDomain: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  emailFromName: string;
  emailFromAddress: string;
  emailProvider: string;
  emailOtpExpiresMinutes: number;
  emailOtpResendSeconds: number;
  emailOtpMaxAttempts: number;
  devEmailOtpConsole: boolean;
  adminSeedName: string;
  adminSeedEmail: string;
  adminSeedPassword: string;
  runAdminSeed: boolean;
  defaultCurrency: string;
  defaultCountry: string;
  defaultTimezone: string;
  paymentProvider: string;
  paymobApiKey: string;
  paymobIntegrationIdCard: string;
  paymobIntegrationIdWallet: string;
  paymobIframeId: string;
  paymobHmacSecret: string;
  paymobWebhookUrl: string;
  fawryMerchantCode: string;
  fawrySecurityKey: string;
  fawryWebhookSecret: string;
  instapayEnabled: boolean;
  instapayAccountReference: string;
  vodafoneCashEnabled: boolean;
  vodafoneCashNumber: string;
  orangeCashEnabled: boolean;
  orangeCashNumber: string;
  etisalatCashEnabled: boolean;
  etisalatCashNumber: string;
  wePayEnabled: boolean;
  wePayNumber: string;
  cashOnDeliveryEnabled: boolean;
  cashOnDeliveryMaxOrderValue: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  uploadProvider: string;
  maxUploadSizeMb: number;
  rateLimitTtlSeconds: number;
  rateLimitMaxRequests: number;
  redisHost: string;
  redisPort: number;
  redisPassword: string;
  campaignQueueEnabled: boolean;
  swaggerEnabled: boolean;
  swaggerPath: string;
  logLevel: string;
}

export const envConfig = registerAs('app', (): EnvConfig => {
  const toBool = (val: string | undefined, fallback = false): boolean => {
    if (val === undefined || val === '') return fallback;
    return val === 'true' || val === '1';
  };

  const toInt = (val: string | undefined, fallback: number): number => {
    if (val === undefined || val === '') return fallback;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
  };

  const toStr = (val: string | undefined, fallback: string): string => {
    return val !== undefined && val !== '' ? val : fallback;
  };

  const toArr = (val: string | undefined, fallback: string[]): string[] => {
    if (val === undefined || val === '') return fallback;
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  return {
    nodeEnv: toStr(process.env.NODE_ENV, 'development'),
    port: toInt(process.env.PORT, 4001),
    apiPrefix: toStr(process.env.API_PREFIX, 'api'),
    appName: toStr(process.env.APP_NAME, 'opps'),
    appUrl: toStr(process.env.APP_URL, 'http://localhost:3000'),
    backendUrl: toStr(process.env.BACKEND_URL, 'http://localhost:4001'),
    mongodbUri: toStr(
      process.env.MONGODB_URI,
      'mongodb://localhost:27017/opps',
    ),
    jwtAccessSecret: toStr(process.env.JWT_ACCESS_SECRET, ''),
    jwtAccessExpiresIn: toStr(process.env.JWT_ACCESS_EXPIRES_IN, '15m'),
    jwtRefreshSecret: toStr(process.env.JWT_REFRESH_SECRET, ''),
    jwtRefreshExpiresIn: toStr(process.env.JWT_REFRESH_EXPIRES_IN, '30d'),
    bcryptSaltRounds: toInt(process.env.BCRYPT_SALT_ROUNDS, 12),
    corsOrigins: toArr(process.env.CORS_ORIGINS, ['http://localhost:3000']),
    cookieSecret: toStr(process.env.COOKIE_SECRET, ''),
    cookieSecure: toBool(process.env.COOKIE_SECURE, false),
    cookieSameSite: toStr(process.env.COOKIE_SAME_SITE, 'lax'),
    cookieDomain: toStr(process.env.COOKIE_DOMAIN, ''),
    smtpHost: toStr(process.env.SMTP_HOST, ''),
    smtpPort: toInt(process.env.SMTP_PORT, 587),
    smtpSecure: toBool(process.env.SMTP_SECURE, false),
    smtpUser: toStr(process.env.SMTP_USER, ''),
    smtpPassword: toStr(process.env.SMTP_PASSWORD, ''),
    emailFromName: toStr(process.env.EMAIL_FROM_NAME, 'opps'),
    emailFromAddress: toStr(process.env.EMAIL_FROM_ADDRESS, 'noreply@opps.com'),
    emailProvider: toStr(process.env.EMAIL_PROVIDER, 'smtp'),
    emailOtpExpiresMinutes: toInt(process.env.EMAIL_OTP_EXPIRES_MINUTES, 10),
    emailOtpResendSeconds: toInt(process.env.EMAIL_OTP_RESEND_SECONDS, 60),
    emailOtpMaxAttempts: toInt(process.env.EMAIL_OTP_MAX_ATTEMPTS, 5),
    devEmailOtpConsole: toBool(process.env.DEV_EMAIL_OTP_CONSOLE, false),
    adminSeedName: toStr(process.env.ADMIN_SEED_NAME, 'opps Admin'),
    adminSeedEmail: toStr(
      process.env.ADMIN_SEED_EMAIL,
      'oppsfoods.egy@gmail.com',
    ),
    adminSeedPassword: toStr(process.env.ADMIN_SEED_PASSWORD, ''),
    runAdminSeed: toBool(process.env.RUN_ADMIN_SEED, false),
    defaultCurrency: toStr(process.env.DEFAULT_CURRENCY, 'EGP'),
    defaultCountry: toStr(process.env.DEFAULT_COUNTRY, 'EG'),
    defaultTimezone: toStr(process.env.DEFAULT_TIMEZONE, 'Africa/Cairo'),
    paymentProvider: toStr(process.env.PAYMENT_PROVIDER, 'disabled'),
    paymobApiKey: toStr(process.env.PAYMOB_API_KEY, ''),
    paymobIntegrationIdCard: toStr(process.env.PAYMOB_INTEGRATION_ID_CARD, ''),
    paymobIntegrationIdWallet: toStr(
      process.env.PAYMOB_INTEGRATION_ID_WALLET,
      '',
    ),
    paymobIframeId: toStr(process.env.PAYMOB_IFRAME_ID, ''),
    paymobHmacSecret: toStr(process.env.PAYMOB_HMAC_SECRET, ''),
    paymobWebhookUrl: toStr(process.env.PAYMOB_WEBHOOK_URL, ''),
    fawryMerchantCode: toStr(process.env.FAWRY_MERCHANT_CODE, ''),
    fawrySecurityKey: toStr(process.env.FAWRY_SECURITY_KEY, ''),
    fawryWebhookSecret: toStr(process.env.FAWRY_WEBHOOK_SECRET, ''),
    instapayEnabled: toBool(process.env.INSTAPAY_ENABLED, false),
    instapayAccountReference: toStr(process.env.INSTAPAY_ACCOUNT_REFERENCE, ''),
    vodafoneCashEnabled: toBool(process.env.VODAFONE_CASH_ENABLED, false),
    vodafoneCashNumber: toStr(process.env.VODAFONE_CASH_NUMBER, ''),
    orangeCashEnabled: toBool(process.env.ORANGE_CASH_ENABLED, false),
    orangeCashNumber: toStr(process.env.ORANGE_CASH_NUMBER, ''),
    etisalatCashEnabled: toBool(process.env.ETISALAT_CASH_ENABLED, false),
    etisalatCashNumber: toStr(process.env.ETISALAT_CASH_NUMBER, ''),
    wePayEnabled: toBool(process.env.WE_PAY_ENABLED, false),
    wePayNumber: toStr(process.env.WE_PAY_NUMBER, ''),
    cashOnDeliveryEnabled: toBool(process.env.CASH_ON_DELIVERY_ENABLED, true),
    cashOnDeliveryMaxOrderValue: toStr(
      process.env.CASH_ON_DELIVERY_MAX_ORDER_VALUE,
      '',
    ),
    cloudinaryCloudName: toStr(process.env.CLOUDINARY_CLOUD_NAME, ''),
    cloudinaryApiKey: toStr(process.env.CLOUDINARY_API_KEY, ''),
    cloudinaryApiSecret: toStr(process.env.CLOUDINARY_API_SECRET, ''),
    uploadProvider: toStr(process.env.UPLOAD_PROVIDER, 'local'),
    maxUploadSizeMb: toInt(process.env.MAX_UPLOAD_SIZE_MB, 5),
    rateLimitTtlSeconds: toInt(process.env.RATE_LIMIT_TTL_SECONDS, 60),
    rateLimitMaxRequests: toInt(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    redisHost: toStr(process.env.REDIS_HOST, 'localhost'),
    redisPort: toInt(process.env.REDIS_PORT, 6379),
    redisPassword: toStr(process.env.REDIS_PASSWORD, ''),
    campaignQueueEnabled: toBool(process.env.CAMPAIGN_QUEUE_ENABLED, false),
    swaggerEnabled: toBool(process.env.SWAGGER_ENABLED, true),
    swaggerPath: toStr(process.env.SWAGGER_PATH, 'docs'),
    logLevel: toStr(process.env.LOG_LEVEL, 'debug'),
  };
});

export type Config = ReturnType<typeof envConfig>;
