import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  REDIS_CLIENT,
  RedisFeature,
  RedisUnavailableError,
} from './redis.types';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private ready = false;
  private readonly enabled: boolean;

  constructor(
    @Inject(REDIS_CLIENT) private readonly client: Redis,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>('app.redisEnabled', false);
    this.client.on('ready', () => {
      this.ready = true;
      this.logger.log('Redis command connection is ready');
    });
    this.client.on('close', () => {
      this.ready = false;
      this.logger.warn('Redis command connection closed');
    });
    this.client.on('error', () => {
      this.ready = false;
      this.logger.error('Redis command connection error');
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) return;
    try {
      if (this.client.status === 'wait') await this.client.connect();
      await this.client.ping();
      this.ready = true;
    } catch (error) {
      this.ready = false;
      this.logger.error('Redis startup readiness check failed');
      throw error;
    }
  }

  isReady(): boolean {
    return this.enabled && this.ready;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  commands(feature: RedisFeature): Redis {
    if (!this.isReady()) throw new RedisUnavailableError(feature);
    return this.client;
  }

  async ping(): Promise<boolean> {
    if (!this.enabled || !this.ready) return false;
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      this.ready = false;
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.status === 'end') return;
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect(false);
    } finally {
      this.ready = false;
    }
  }
}
