import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VerifiedAccountGuard } from '../common/guards/verified-account.guard';

@Controller('cart')
@UseGuards(VerifiedAccountGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getCart(@CurrentUser('sub') userId: string) {
    return this.cartService.getCart('', userId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  addItem(@CurrentUser('sub') userId: string, @Body() dto: AddToCartDto) {
    return this.cartService.addItem('', userId, dto);
  }

  @Patch('items')
  @HttpCode(HttpStatus.OK)
  updateItem(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity('', userId, dto);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @CurrentUser('sub') userId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem('', userId, itemId);
  }

  @Post('coupon')
  @HttpCode(HttpStatus.OK)
  applyCoupon(@CurrentUser('sub') userId: string, @Body() dto: ApplyCouponDto) {
    return this.cartService.applyCoupon('', userId, dto.code);
  }

  @Delete('coupon')
  @HttpCode(HttpStatus.OK)
  removeCoupon(@CurrentUser('sub') userId: string) {
    return this.cartService.removeCoupon('', userId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  clearCart(@CurrentUser('sub') userId: string) {
    return this.cartService.clearCart('', userId);
  }
}
