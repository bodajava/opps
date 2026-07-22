import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { Public } from '../common/decorators/public.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import {
  textValue,
  toDynamicRecord,
} from '../common/helpers/dynamic-value.helper';

interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Public()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private getSessionId(req: Request, res: Response): string {
    let sessionId = textValue(toDynamicRecord(req.cookies).cart_session);
    if (!sessionId) {
      sessionId = uuidv4();
      res.cookie('cart_session', sessionId, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });
    }
    return sessionId;
  }

  private getUserId(req: RequestWithUser): string | undefined {
    return req.user?.sub;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getCart(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = this.getSessionId(req, res);
    return this.cartService.getCart(sessionId, this.getUserId(req));
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  async addItem(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AddToCartDto,
  ) {
    const sessionId = this.getSessionId(req, res);
    return this.cartService.addItem(sessionId, this.getUserId(req), dto);
  }

  @Patch('items')
  @HttpCode(HttpStatus.OK)
  async updateItem(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: UpdateCartItemDto,
  ) {
    const sessionId = this.getSessionId(req, res);
    return this.cartService.updateItemQuantity(
      sessionId,
      this.getUserId(req),
      dto,
    );
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
  ) {
    const sessionId = this.getSessionId(req, res);
    return this.cartService.removeItem(sessionId, this.getUserId(req), itemId);
  }

  @Post('coupon')
  @HttpCode(HttpStatus.OK)
  async applyCoupon(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: ApplyCouponDto,
  ) {
    const sessionId = this.getSessionId(req, res);
    return this.cartService.applyCoupon(
      sessionId,
      this.getUserId(req),
      dto.code,
    );
  }

  @Delete('coupon')
  @HttpCode(HttpStatus.OK)
  async removeCoupon(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = this.getSessionId(req, res);
    return this.cartService.removeCoupon(sessionId, this.getUserId(req));
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async clearCart(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = this.getSessionId(req, res);
    return this.cartService.clearCart(sessionId, this.getUserId(req));
  }
}
