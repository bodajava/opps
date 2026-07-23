import { Injectable, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';

export type DependencyStatus = 'up' | 'down' | 'disabled';

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  mongodb: DependencyStatus;
  redis: DependencyStatus;
  queue: DependencyStatus;
}

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Optional() private readonly redis?: RedisService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  async checkHealth(): Promise<HealthResponse> {
    const state: number = this.connection.readyState;
    const mongodb: DependencyStatus = state === 1 ? 'up' : 'down';
    const redisEnabled = this.redis?.isEnabled() ?? false;
    const redis: DependencyStatus = redisEnabled
      ? (await this.redis?.ping())
        ? 'up'
        : 'down'
      : 'disabled';
    const queueEnabled =
      this.config?.get<boolean>('app.emailQueueEnabled', false) ?? false;
    const queue: DependencyStatus = queueEnabled
      ? redis === 'up'
        ? 'up'
        : 'down'
      : 'disabled';
    const criticalDown =
      mongodb === 'down' ||
      (redisEnabled && redis === 'down') ||
      (queueEnabled && queue === 'down');

    return {
      status: criticalDown
        ? 'unhealthy'
        : redis === 'disabled'
          ? 'degraded'
          : 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      mongodb,
      redis,
      queue,
    };
  }
}
