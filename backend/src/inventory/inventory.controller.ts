import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { QueryInventoryDto } from './dto/query-inventory.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getInventory(@Query() query: QueryInventoryDto) {
    return this.inventoryService.getPaginatedStock(query);
  }

  @Get('stock')
  @HttpCode(HttpStatus.OK)
  async getCurrentStock(
    @Query('productId') productId?: string,
    @Query('variantId') variantId?: string,
  ) {
    return this.inventoryService.getCurrentStock(productId, variantId);
  }

  @Get('low-stock')
  @HttpCode(HttpStatus.OK)
  async getLowStock(@Query('threshold') threshold?: string) {
    return this.inventoryService.getLowStockItems(
      threshold ? parseInt(threshold, 10) : undefined,
    );
  }

  @Get('out-of-stock')
  @HttpCode(HttpStatus.OK)
  async getOutOfStock() {
    return this.inventoryService.getOutOfStockItems();
  }

  @Get('movements')
  @HttpCode(HttpStatus.OK)
  async getMovements(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getMovements({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      productId,
      type,
      startDate,
      endDate,
    });
  }

  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  async adjustStock(
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.adjustStock(dto, user.sub || user.email);
  }

  @Get('report')
  @HttpCode(HttpStatus.OK)
  async getStockReport() {
    return this.inventoryService.getStockReport();
  }
}
