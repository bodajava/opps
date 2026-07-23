export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export enum RedisFeature {
  RateLimit = 'rate_limit',
  Otp = 'otp',
  Login = 'login',
  Email = 'email',
  Queue = 'queue',
}

export class RedisUnavailableError extends Error {
  constructor(readonly feature: RedisFeature) {
    super(`${feature} temporarily unavailable`);
    this.name = 'RedisUnavailableError';
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAtEpochSeconds: number;
}

export interface OtpAttemptResult {
  allowed: boolean;
  attempts: number;
  remaining: number;
  retryAfterSeconds: number;
}

export enum EmailDeduplicationState {
  Queued = 'queued',
  Processing = 'processing',
  Sent = 'sent',
  Failed = 'failed',
}
