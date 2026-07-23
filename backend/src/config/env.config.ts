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
  supportEmail: string;
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
  redisEnabled: boolean;
  redisUrl: string;
  redisConnectTimeoutMs: number;
  redisCommandTimeoutMs: number;
  redisKeyPrefix: string;
  redisRateLimitEnabled: boolean;
  emailQueueEnabled: boolean;
  emailQueueName: string;
  emailQueueConcurrency: number;
  emailQueueMaxAttempts: number;
  emailQueueBackoffMs: number;
  emailQueueEncryptionKey: string;
  emailDeduplicationTtlSeconds: number;
  otpLockSeconds: number;
  loginMaxAttempts: number;
  loginAttemptWindowSeconds: number;
  loginLockSeconds: number;
  forgotPasswordMaxRequests: number;
  forgotPasswordWindowSeconds: number;
  swaggerEnabled: boolean;
  swaggerPath: string;
  logLevel: string;
}

export const envConfig = registerAs('app', (): EnvConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const vercelHostname =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || '';
  const vercelUrl = vercelHostname
    ? `https://${vercelHostname.replace(/^https?:\/\//, '')}`
    : '';
  const toBool = (val: string | undefined, fallback = false): boolean => {
    if (val === undefined || val === '') return fallback;
    return val === 'true' || val === '1';
  };

  const toInt = (val: string | undefined, fallback: number): number => {
    if (val === undefined || val === '') return fallback;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
  };

  const boundedInt = (
    name: string,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number => {
    const value = toInt(process.env[name], fallback);
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      throw new Error(
        `${name} must be an integer between ${minimum} and ${maximum}`,
      );
    }
    return value;
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
    nodeEnv,
    port: toInt(process.env.PORT, 4001),
    apiPrefix: toStr(process.env.API_PREFIX, 'api'),
    appName: toStr(process.env.APP_NAME, 'opps'),
    appUrl: (() => {
      const value = toStr(process.env.APP_URL, 'http://localhost:3000');
      if (vercelUrl && /localhost|127\.0\.0\.1/.test(value)) {
        return vercelUrl;
      }
      if (nodeEnv === 'production' && /localhost|127\.0\.0\.1/.test(value)) {
        throw new Error(
          'APP_URL must be a public production URL in production',
        );
      }
      return value;
    })(),
    backendUrl: (() => {
      const value = toStr(
        process.env.BACKEND_URL,
        'http://localhost:4001',
      );
      return vercelUrl && /localhost|127\.0\.0\.1/.test(value)
        ? vercelUrl
        : value;
    })(),
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
    supportEmail: toStr(process.env.SUPPORT_EMAIL, ''),
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
    redisEnabled: toBool(process.env.REDIS_ENABLED, false),
    redisUrl: (() => {
      const enabled = toBool(process.env.REDIS_ENABLED, false);
      const url = toStr(process.env.REDIS_URL, '');
      if (enabled && !/^rediss?:\/\//.test(url)) {
        throw new Error(
          'REDIS_URL must be configured with a redis:// or rediss:// URL when Redis is enabled',
        );
      }
      if (
        enabled &&
        nodeEnv === 'production' &&
        /replace|placeholder|your-redis-host/i.test(url)
      ) {
        throw new Error(
          'REDIS_URL contains a placeholder and is not valid in production',
        );
      }
      if (toBool(process.env.EMAIL_QUEUE_ENABLED, false) && !enabled) {
        throw new Error(
          'REDIS_ENABLED must be true when EMAIL_QUEUE_ENABLED is true',
        );
      }
      return url;
    })(),
    redisConnectTimeoutMs: boundedInt(
      'REDIS_CONNECT_TIMEOUT_MS',
      10000,
      1000,
      60000,
    ),
    redisCommandTimeoutMs: boundedInt(
      'REDIS_COMMAND_TIMEOUT_MS',
      5000,
      100,
      30000,
    ),
    redisKeyPrefix: toStr(process.env.REDIS_KEY_PREFIX, 'opps'),
    redisRateLimitEnabled: toBool(
      process.env.REDIS_RATE_LIMIT_ENABLED,
      toBool(process.env.REDIS_ENABLED, false),
    ),
    emailQueueEnabled: toBool(process.env.EMAIL_QUEUE_ENABLED, false),
    emailQueueName: toStr(process.env.EMAIL_QUEUE_NAME, 'opps-email'),
    emailQueueConcurrency: boundedInt('EMAIL_QUEUE_CONCURRENCY', 5, 1, 100),
    emailQueueMaxAttempts: boundedInt('EMAIL_QUEUE_MAX_ATTEMPTS', 5, 1, 20),
    emailQueueBackoffMs: boundedInt(
      'EMAIL_QUEUE_BACKOFF_MS',
      5000,
      100,
      300000,
    ),
    emailQueueEncryptionKey: (() => {
      const value = toStr(process.env.EMAIL_QUEUE_ENCRYPTION_KEY, '');
      if (
        toBool(process.env.EMAIL_QUEUE_ENABLED, false) &&
        Buffer.from(value, 'base64').length !== 32
      ) {
        throw new Error(
          'EMAIL_QUEUE_ENCRYPTION_KEY must be a base64-encoded 32-byte key when the email queue is enabled',
        );
      }
      return value;
    })(),
    emailDeduplicationTtlSeconds: boundedInt(
      'EMAIL_DEDUPLICATION_TTL_SECONDS',
      300,
      10,
      86400,
    ),
    otpLockSeconds: boundedInt('OTP_LOCK_SECONDS', 900, 60, 86400),
    loginMaxAttempts: boundedInt('LOGIN_MAX_ATTEMPTS', 5, 1, 100),
    loginAttemptWindowSeconds: boundedInt(
      'LOGIN_ATTEMPT_WINDOW_SECONDS',
      900,
      60,
      86400,
    ),
    loginLockSeconds: boundedInt('LOGIN_LOCK_SECONDS', 900, 60, 86400),
    forgotPasswordMaxRequests: boundedInt(
      'FORGOT_PASSWORD_MAX_REQUESTS',
      3,
      1,
      100,
    ),
    forgotPasswordWindowSeconds: boundedInt(
      'FORGOT_PASSWORD_WINDOW_SECONDS',
      900,
      60,
      86400,
    ),
    swaggerEnabled: toBool(process.env.SWAGGER_ENABLED, true),
    swaggerPath: toStr(process.env.SWAGGER_PATH, 'docs'),
    logLevel: toStr(process.env.LOG_LEVEL, 'debug'),
  };
});

export type Config = ReturnType<typeof envConfig>;
