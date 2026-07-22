import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  async getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('sales')
  @HttpCode(HttpStatus.OK)
  async getSalesData(
    @Query('period') period: 'day' | 'week' | 'month' = 'month',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getSalesData(period, startDate, endDate);
  }

  @Get('orders-by-status')
  @HttpCode(HttpStatus.OK)
  async getOrdersByStatus() {
    return this.analyticsService.getOrdersByStatus();
  }

  @Get('revenue-by-payment')
  @HttpCode(HttpStatus.OK)
  async getRevenueByPaymentMethod() {
    return this.analyticsService.getRevenueByPaymentMethod();
  }

  @Get('best-selling-products')
  @HttpCode(HttpStatus.OK)
  async getBestSellingProducts(@Query('limit') limit?: string) {
    return this.analyticsService.getBestSellingProducts(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('sales-by-governorate')
  @HttpCode(HttpStatus.OK)
  async getSalesByGovernorate() {
    return this.analyticsService.getSalesByGovernorate();
  }

  @Get('coupon-usage')
  @HttpCode(HttpStatus.OK)
  async getCouponUsage() {
    return this.analyticsService.getCouponUsage();
  }

  @Get('customers-new-vs-returning')
  @HttpCode(HttpStatus.OK)
  async getNewVsReturningCustomers() {
    return this.analyticsService.getNewVsReturningCustomers();
  }

  @Get('product-performance')
  @HttpCode(HttpStatus.OK)
  async getProductPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getProductPerformance(startDate, endDate);
  }
}
