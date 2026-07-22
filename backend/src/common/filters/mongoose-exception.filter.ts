import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';

@Catch(MongooseError.ValidationError, MongooseError.CastError)
export class MongooseExceptionFilter implements ExceptionFilter {
  catch(
    exception: MongooseError.ValidationError | MongooseError.CastError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.BAD_REQUEST;
    let message = 'Validation failed';
    let errors: string[] = [];

    if (exception instanceof MongooseError.ValidationError) {
      errors = Object.values(exception.errors).map((err) => err.message);
      message = errors[0] || message;
    }

    if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid ${exception.path}: ${exception.value}`;
      errors = [message];
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
