import { HttpException, HttpStatus } from '@nestjs/common';

export interface RateLimitErrorBody {
  code: string;
  message: string;
  retryAfterSeconds: number;
  limit: number;
  remaining: number;
  resetAtEpochSeconds: number;
}

export class RateLimitException extends HttpException {
  constructor(readonly details: RateLimitErrorBody) {
    super(details, HttpStatus.TOO_MANY_REQUESTS);
  }
}
