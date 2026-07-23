import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { toDynamicRecord } from '../helpers/dynamic-value.helper';
import { RateLimitException } from '../exceptions/rate-limit.exception';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const isProduction = process.env.NODE_ENV === 'production';

    let message: string = exception.message;
    let errors: string | string[] | undefined;
    let safeDetails: DynamicRecord = {};

    if (typeof exceptionResponse === 'object') {
      const resp = toDynamicRecord(exceptionResponse);
      const respMessage = resp.message;
      if (typeof respMessage === 'string') {
        message = respMessage;
      } else if (Array.isArray(respMessage)) {
        errors = respMessage.filter(
          (item): item is string => typeof item === 'string',
        );
        message = errors[0] || 'Validation failed';
      }
      const respError = resp.error;
      if (typeof respError === 'string') {
        message = message || respError;
      }
      if (
        resp.code === 'ACCOUNT_VERIFICATION_REQUIRED' &&
        resp.status === 'pending_verification' &&
        resp.verificationChannel === 'email' &&
        typeof resp.maskedDestination === 'string' &&
        typeof resp.verificationFlowId === 'string' &&
        typeof resp.expiresInSeconds === 'number' &&
        typeof resp.resendAfterSeconds === 'number'
      ) {
        safeDetails = {
          code: resp.code,
          status: resp.status,
          verificationChannel: resp.verificationChannel,
          maskedDestination: resp.maskedDestination,
          verificationFlowId: resp.verificationFlowId,
          expiresInSeconds: resp.expiresInSeconds,
          resendAfterSeconds: resp.resendAfterSeconds,
        };
      }
    }

    if (status === 500 && isProduction) {
      message = 'Internal server error';
      errors = undefined;
    }

    if (exception instanceof RateLimitException) {
      response.setHeader('Retry-After', exception.details.retryAfterSeconds);
      response.setHeader('X-RateLimit-Limit', exception.details.limit);
      response.setHeader('X-RateLimit-Remaining', exception.details.remaining);
      response.setHeader(
        'X-RateLimit-Reset',
        exception.details.resetAtEpochSeconds,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...safeDetails,
      ...(exception instanceof RateLimitException
        ? {
            code: exception.details.code,
            retryAfterSeconds: exception.details.retryAfterSeconds,
          }
        : {}),
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
