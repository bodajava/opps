import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user?: DynamicRecord;
}

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user: DynamicRecord | undefined = request.user;
    return data ? user?.[data] : user;
  },
);
