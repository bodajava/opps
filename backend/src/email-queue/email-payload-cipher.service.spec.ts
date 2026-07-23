import { ConfigService } from '@nestjs/config';
import { EmailPayloadCipherService } from './email-payload-cipher.service';
import { randomInt } from 'crypto';

describe('EmailPayloadCipherService', () => {
  const key = Buffer.alloc(32, 7).toString('base64');

  it('encrypts OTP payloads with authenticated encryption', () => {
    const cipher = new EmailPayloadCipherService(
      new ConfigService({ app: { emailQueueEncryptionKey: key } }),
    );
    const otp = randomInt(100000, 1000000).toString();
    const encrypted = cipher.encrypt(otp);
    expect(encrypted).not.toContain(otp);
    expect(cipher.decrypt(encrypted)).toBe(otp);
  });

  it('rejects malformed encrypted payloads', () => {
    const cipher = new EmailPayloadCipherService(
      new ConfigService({ app: { emailQueueEncryptionKey: key } }),
    );
    expect(() => cipher.decrypt('malformed')).toThrow(
      'Malformed encrypted email payload',
    );
  });
});
