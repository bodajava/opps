import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

export class OtpHelper {
  static generateOTP(): string {
    return String(randomInt(100000, 1000000));
  }

  static async hashOTP(otp: string, saltRounds = 12): Promise<string> {
    return bcrypt.hash(otp, saltRounds);
  }

  static async verifyOTP(otp: string, hash: string): Promise<boolean> {
    return bcrypt.compare(otp, hash);
  }
}
