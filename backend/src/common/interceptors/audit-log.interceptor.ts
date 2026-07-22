import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user?: { _id?: string; id?: string; email?: string };
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  intercept<T>(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { method, url, user } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        if (user) {
          const auditEntry = {
            action: `${method} ${url}`,
            userId: user._id || user.id,
            email: user.email,
            timestamp: new Date().toISOString(),
            duration,
          };
          if (process.env.NODE_ENV !== 'production') {
            this.logger.debug(JSON.stringify(auditEntry));
          }
        }
      }),
    );
  }
}
