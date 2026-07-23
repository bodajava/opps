import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EmailPayloadCipherService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const encoded = config.get<string>('app.emailQueueEncryptionKey', '');
    this.key = Buffer.from(encoded, 'base64');
    if (this.key.length !== 32) {
      throw new Error('EMAIL_QUEUE_ENCRYPTION_KEY must decode to 32 bytes');
    }
  }

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return [
      'v1',
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string): string {
    const parts = value.split('.');
    if (
      parts.length !== 4 ||
      parts[0] !== 'v1' ||
      !parts[1] ||
      !parts[2] ||
      !parts[3]
    ) {
      throw new Error('Malformed encrypted email payload');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(parts[1], 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(parts[2], 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[3], 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
