import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { CheckoutService } from './checkout.service';
import { CheckoutQuoteDto } from './dto/checkout-quote.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { Public } from '../common/decorators/public.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import {
  textValue,
  toDynamicRecord,
} from '../common/helpers/dynamic-value.helper';
import { Throttle } from '@nestjs/throttler';

interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Public()
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('quote')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async getQuote(@Body() dto: CheckoutQuoteDto) {
    return this.checkoutService.getQuote(dto);
  }

  @Post('orders')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() dto: CreateOrderDto, @Req() req: RequestWithUser) {
    const sessionId =
      textValue(toDynamicRecord(req.cookies).cart_session) || undefined;
    const userId = req.user?.sub;
    return this.checkoutService.createOrder(dto, sessionId, userId);
  }
}
