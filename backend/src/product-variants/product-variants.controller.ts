import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductVariantsService } from './product-variants.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@Controller('admin/product-variants')
export class ProductVariantsController {
  constructor(
    private readonly productVariantsService: ProductVariantsService,
  ) {}

  @Get('product/:productId')
  @HttpCode(HttpStatus.OK)
  async findByProduct(@Param('productId') productId: string) {
    return this.productVariantsService.findByProduct(productId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.productVariantsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductVariantDto) {
    return this.productVariantsService.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateProductVariantDto) {
    return this.productVariantsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.productVariantsService.delete(id);
  }

  @Patch(':id/stock')
  @HttpCode(HttpStatus.OK)
  async updateStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.productVariantsService.updateStock(id, quantity);
  }
}
