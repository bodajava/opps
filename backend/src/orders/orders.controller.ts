import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response, Request } from 'express';
import { OrdersService } from './orders.service';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Get('orders/track/:orderNumber')
  @HttpCode(HttpStatus.OK)
  async trackByNumber(
    @Param('orderNumber') orderNumber: string,
    @Query('email') email: string,
  ) {
    if (!email) {
      throw new NotFoundException('Email is required to track an order');
    }
    return this.ordersService.trackByOrderNumber(orderNumber, email);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('orders')
  @HttpCode(HttpStatus.OK)
  async myOrders(@CurrentUser() user: JwtPayload) {
    return this.ordersService.findByEmail(user.email);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/orders')
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAll(query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/orders/stats')
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return this.ordersService.getOrderStats();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/orders/export/csv')
  @HttpCode(HttpStatus.OK)
  async exportCsv(@Query() query: QueryOrdersDto, @Res() res: Response) {
    const allQuery = { ...query, limit: 10000, page: 1 };
    const result = await this.ordersService.findAll(allQuery);

    const header =
      'Order Number,Customer Name,Email,Phone,Status,Payment Status,Payment Method,Subtotal,Discount,Delivery Fee,Total,Created At\n';
    const rows = result.items
      .map(
        (o) =>
          `"${o.orderNumber}","${o.customerName}","${o.customerEmail}","${o.customerPhone}","${o.orderStatus}","${o.paymentStatus}","${o.paymentMethod}",${o.subtotal},${o.discount},${o.deliveryFee},${o.total},"${o.createdAt.toISOString()}"`,
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(header + rows);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/orders/:id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Patch('admin/orders/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.updateStatus(id, dto, user.email || user.sub);
  }
}
