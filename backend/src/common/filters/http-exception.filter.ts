import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { toDynamicRecord } from '../helpers/dynamic-value.helper';

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
    }

    if (status === 500 && isProduction) {
      message = 'Internal server error';
      errors = undefined;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
