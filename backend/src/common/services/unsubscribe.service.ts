import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class UnsubscribeTokenService {
  generateToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
