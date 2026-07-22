import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { BulkUpdateProductsDto } from './dto/bulk-update-products.dto';
import { UpdateProductStockDto } from './dto/update-product-stock.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get('products')
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get('products/featured')
  @HttpCode(HttpStatus.OK)
  async getFeatured() {
    return this.productsService.getFeatured();
  }

  @Public()
  @Get('products/best-sellers')
  @HttpCode(HttpStatus.OK)
  async getBestSellers() {
    return this.productsService.getBestSellers();
  }

  @Public()
  @Get('products/:slug')
  @HttpCode(HttpStatus.OK)
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/products')
  @HttpCode(HttpStatus.OK)
  async adminFindAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query, true);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Post('admin/products')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Patch('admin/products/bulk')
  @HttpCode(HttpStatus.OK)
  async bulkUpdate(@Body() dto: BulkUpdateProductsDto) {
    return this.productsService.bulkUpdateStatus(dto.ids, dto.isActive);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Patch('admin/products/:id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Delete('admin/products/:id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @Query('permanent') permanent?: string,
  ) {
    if (permanent === 'true') {
      return this.productsService.delete(id);
    }
    return this.productsService.archive(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Patch('admin/products/:id/stock')
  @HttpCode(HttpStatus.OK)
  async updateStock(
    @Param('id') id: string,
    @Body() dto: UpdateProductStockDto,
  ) {
    return this.productsService.updateStock(id, dto.quantity);
  }
}
