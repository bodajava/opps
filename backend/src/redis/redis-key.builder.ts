import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisKeyBuilder {
  private readonly root: string;

  constructor(config: ConfigService) {
    const prefix = config.get<string>('app.redisKeyPrefix', 'opps');
    const environment = config.get<string>('app.nodeEnv', 'development');
    this.root = `${prefix}:${environment}:v1`;
  }

  hash(value: string): string {
    return createHash('sha256')
      .update(value.trim().toLowerCase())
      .digest('hex');
  }

  otpSend(purpose: string, email: string): string {
    return `${this.root}:otp:send:${purpose}:${this.hash(email)}`;
  }

  otpAttempts(purpose: string, email: string): string {
    return `${this.root}:otp:attempts:${purpose}:${this.hash(email)}`;
  }

  otpLock(purpose: string, email: string): string {
    return `${this.root}:otp:lock:${purpose}:${this.hash(email)}`;
  }

  loginIp(ip: string): string {
    return `${this.root}:auth:login:ip:${this.hash(ip)}`;
  }

  loginPair(ip: string, email: string): string {
    return `${this.root}:auth:login:pair:${this.hash(ip)}:${this.hash(email)}`;
  }

  emailDeduplication(
    template: string,
    recipient: string,
    operationId: string,
  ): string {
    return `${this.root}:email:dedupe:${template}:${this.hash(recipient)}:${this.hash(operationId)}`;
  }

  rate(route: string, identity: string): string {
    return `${this.root}:rate:${this.hash(route)}:${this.hash(identity)}`;
  }
}
