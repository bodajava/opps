import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { PaymentRegistryService } from './payment-registry.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { Request } from 'express';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentRegistry: PaymentRegistryService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('payments/create-session')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.paymentsService.createPaymentSession(
      dto.orderId,
      dto.paymentMethod,
      user?.sub,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('payments/verify/:reference')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Param('reference') reference: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.getPaymentStatusByReference(
      reference,
      user?.sub,
    );
  }

  @Public()
  @Get('payments/guest-status/:reference')
  @HttpCode(HttpStatus.OK)
  async guestStatus(
    @Param('reference') reference: string,
    @Query('token') statusToken: string,
  ) {
    return this.paymentsService.getGuestPaymentStatus(reference, statusToken);
  }

  @Public()
  @Post('payments/webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Param('provider') provider: string,
    @Body() payload: DynamicRecord,
    @Req() req: Request,
  ) {
    const signatureHeader =
      req.headers['x-hmac-signature'] || req.headers['signature'] || '';
    const signature = Array.isArray(signatureHeader)
      ? (signatureHeader[0] ?? '')
      : signatureHeader;
    await this.paymentsService.handleWebhook(provider, payload, signature);
    return { received: true };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/payments')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('search') search?: string,
  ) {
    return this.paymentsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      paymentMethod,
      search,
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/payments/:id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.paymentsService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Post('admin/payments/:id/mark-paid')
  @HttpCode(HttpStatus.OK)
  async markPaid(@Param('id') id: string, @CurrentUser('sub') adminId: string) {
    return this.paymentsService.markAsPaid(id, adminId || 'system');
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Post('admin/payments/:id/mark-review')
  @HttpCode(HttpStatus.OK)
  async markReview(@Param('id') id: string) {
    return this.paymentsService.markAsUnderReview(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Post('admin/payments/:id/refund')
  @HttpCode(HttpStatus.OK)
  async refund(@Param('id') id: string, @Body('amount') amount?: number) {
    return this.paymentsService.processRefund(id, amount);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/payment-methods')
  @HttpCode(HttpStatus.OK)
  getAvailableMethods() {
    return this.paymentRegistry.getAvailableMethods();
  }
}
